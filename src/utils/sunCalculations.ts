import { DateTime } from 'luxon';
import * as SunCalc from 'suncalc';
import { ASTRONOMICAL_CONSTANTS, EARTH_CONSTANTS } from '@data/constants';
import type { SunPosition, DayNightBoundary, SunlightData, Coordinates } from '@/types/geography';

/**
 * 太阳位置计算工具类
 *
 * 公式来自 NOAA Solar Calculator（Meeus 简化算法），精度约 0.01°。
 * 约定：所有角度的入参和返回值都是**度**；经度东正西负，范围 [-180, 180]。
 */
export class SunPositionCalculator {
  /**
   * 计算指定时刻的太阳直射点（赤纬 = 直射点纬度，longitude = 直射点经度）
   */
  static calculateSunPosition(dateTime: DateTime): SunPosition {
    const jd = this.getJulianDay(dateTime);
    const centuries = (jd - ASTRONOMICAL_CONSTANTS.JULIAN_DAY_J2000) / 36525.0;

    // 太阳几何平黄经 L0
    const geomMeanLongSun = this.normalizeDegrees(
      280.46646 + centuries * (36000.76983 + centuries * 0.0003032)
    );

    // 太阳平近点角 M
    const geomMeanAnomSun =
      357.52911 + centuries * (35999.05029 - 0.0001537 * centuries);

    // 地球轨道偏心率 e
    const eccentEarth =
      0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);

    // 太阳中心方程
    const meanAnomRad = this.toRadians(geomMeanAnomSun);
    const sunEq =
      Math.sin(meanAnomRad) *
        (1.914602 - centuries * (0.004817 + 0.000014 * centuries)) +
      Math.sin(2 * meanAnomRad) * (0.019993 - 0.000101 * centuries) +
      Math.sin(3 * meanAnomRad) * 0.000289;

    // 太阳真黄经与视黄经（视黄经含章动和光行差修正）
    const sunTrueLong = geomMeanLongSun + sunEq;
    const omega = this.toRadians(125.04 - 1934.136 * centuries);
    const sunAppLong = sunTrueLong - 0.00569 - 0.00478 * Math.sin(omega);

    // 黄赤交角（含章动修正）
    const meanObliq =
      23 +
      (26 +
        (21.448 -
          centuries *
            (46.815 + centuries * (0.00059 - centuries * 0.001813))) /
          60) /
        60;
    const obliqCorr = meanObliq + 0.00256 * Math.cos(omega);

    // 赤纬：也就是直射点纬度
    const declination = this.toDegrees(
      Math.asin(
        Math.sin(this.toRadians(obliqCorr)) *
          Math.sin(this.toRadians(sunAppLong))
      )
    );

    // 均时差（分钟）：真太阳时 - 平太阳时
    const y = Math.tan(this.toRadians(obliqCorr / 2)) ** 2;
    const meanLongRad = this.toRadians(geomMeanLongSun);
    const equationOfTime =
      4 *
      this.toDegrees(
        y * Math.sin(2 * meanLongRad) -
          2 * eccentEarth * Math.sin(meanAnomRad) +
          4 * eccentEarth * y * Math.sin(meanAnomRad) * Math.cos(2 * meanLongRad) -
          0.5 * y * y * Math.sin(4 * meanLongRad) -
          1.25 * eccentEarth * eccentEarth * Math.sin(2 * meanAnomRad)
      );

    // 直射点经度：真太阳时为正午的那条经线。
    // 地球每分钟自转 0.25°，UTC 正午时直射点在 0° 附近，之后向西移动。
    const utc = dateTime.toUTC();
    const utcMinutes =
      utc.hour * 60 + utc.minute + utc.second / 60 + utc.millisecond / 60000;
    const longitude = this.normalizeLongitude(
      -(utcMinutes + equationOfTime - 720) / 4
    );

    return {
      declination,
      longitude,
      rightAscension: this.calculateRightAscension(sunAppLong, obliqCorr),
      equationOfTime,
    };
  }

  /**
   * 计算晨昏线（太阳几何高度角为 0° 的大圆），按经度每 2° 采样。
   *
   * 由 sinφ·sinδ + cosφ·cosδ·cosH = 0 得 tanφ = -cosH / tanδ。
   * 这里必须用 atan 而不是 atan2：纬度只能落在 [-90°, 90°]。
   */
  static calculateDayNightBoundary(sunPosition: SunPosition): DayNightBoundary {
    const points: Array<{ lat: number; lng: number }> = [];
    const { longitude } = sunPosition;

    // 春秋分时 δ→0，晨昏线退化为两条经线；钳到一个极小值避免除零，
    // 此时算出的线在极点附近几乎竖直，仍然是正确的形状。
    const minDeclination = 0.01;
    const declination =
      Math.abs(sunPosition.declination) < minDeclination
        ? sunPosition.declination < 0
          ? -minDeclination
          : minDeclination
        : sunPosition.declination;
    const tanDeclination = Math.tan(this.toRadians(declination));

    for (let lng = -180; lng <= 180; lng += 2) {
      const hourAngle = this.toRadians(lng - longitude);
      const lat = this.toDegrees(
        Math.atan(-Math.cos(hourAngle) / tanDeclination)
      );
      points.push({ lat, lng });
    }

    return {
      points,
      sunLongitude: longitude,
      isDaylight: (lat: number, lng: number) => {
        return this.isDaylight(lat, lng, sunPosition);
      },
    };
  }

  /**
   * 获取完整的太阳光照数据（日出日落来自 SunCalc）
   */
  static calculateSunlightData(
    dateTime: DateTime,
    latitude = 0,
    longitude = 0
  ): SunlightData {
    const sunPosition = this.calculateSunPosition(dateTime);
    const dayNightBoundary = this.calculateDayNightBoundary(sunPosition);
    const sunTimes = SunCalc.getTimes(dateTime.toJSDate(), latitude, longitude);

    return {
      sunPosition,
      dayNightBoundary,
      sunriseTime: sunTimes.sunrise,
      sunsetTime: sunTimes.sunset,
      solarNoon: sunTimes.solarNoon,
    };
  }

  /**
   * 给定直射点，计算某地的太阳几何高度角（度，未做大气折射修正）
   */
  static altitudeAt(
    latitude: number,
    longitude: number,
    sunPosition: SunPosition
  ): number {
    const decRad = this.toRadians(sunPosition.declination);
    const latRad = this.toRadians(latitude);
    const haRad = this.toRadians(longitude - sunPosition.longitude);

    const sinAltitude =
      Math.sin(decRad) * Math.sin(latRad) +
      Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);

    return this.toDegrees(Math.asin(Math.max(-1, Math.min(1, sinAltitude))));
  }

  /**
   * 判断指定坐标是否为白昼
   */
  static isDaylight(
    latitude: number,
    longitude: number,
    sunPosition: SunPosition
  ): boolean {
    // 考虑大气折射和太阳视半径，高度角大于 -0.833° 时为白昼
    return (
      this.altitudeAt(latitude, longitude, sunPosition) >
      -ASTRONOMICAL_CONSTANTS.ATMOSPHERIC_REFRACTION
    );
  }

  /**
   * 计算指定位置、指定时刻的太阳高度角
   */
  static calculateSunAltitude(
    latitude: number,
    longitude: number,
    dateTime: DateTime
  ): number {
    return this.altitudeAt(
      latitude,
      longitude,
      this.calculateSunPosition(dateTime)
    );
  }

  // 私有辅助方法

  private static getJulianDay(dateTime: DateTime): number {
    return dateTime.toMillis() / 86400000 + 2440587.5;
  }

  private static toRadians(degrees: number): number {
    return degrees * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
  }

  private static toDegrees(radians: number): number {
    return radians * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES;
  }

  /** 归一化到 [0, 360) */
  private static normalizeDegrees(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
  }

  /** 归一化到 [-180, 180) */
  private static normalizeLongitude(longitude: number): number {
    return this.normalizeDegrees(longitude + 180) - 180;
  }

  private static calculateRightAscension(
    sunAppLong: number,
    obliqCorr: number
  ): number {
    const ra = Math.atan2(
      Math.cos(this.toRadians(obliqCorr)) * Math.sin(this.toRadians(sunAppLong)),
      Math.cos(this.toRadians(sunAppLong))
    );
    return this.normalizeDegrees(this.toDegrees(ra));
  }
}

/**
 * 坐标转换工具类
 */
export class CoordinateUtils {
  /**
   * 将经纬度转换为3D球面坐标
   */
  static latLngToCartesian(
    latitude: number, 
    longitude: number, 
    radius: number = EARTH_CONSTANTS.RADIUS_3D
  ): { x: number; y: number; z: number } {
    const phi = (90 - latitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const theta = (longitude + 180) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    
    return { x, y, z };
  }

  /**
   * 将3D笛卡尔坐标转换为经纬度
   */
  static cartesianToLatLng(
    x: number, 
    y: number, 
    z: number
  ): Coordinates {
    const r = Math.sqrt(x * x + y * y + z * z);
    const latitude = 90 - Math.acos(y / r) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES;
    const longitude = ((Math.atan2(z, -x) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES + 360) % 360) - 180;
    
    return {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude
    };
  }

  /**
   * 计算两点间的大圆距离
   */
  static calculateDistance(
    coord1: Coordinates, 
    coord2: Coordinates, 
    radius: number = EARTH_CONSTANTS.RADIUS
  ): number {
    const lat1Rad = coord1.latitude * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const lat2Rad = coord2.latitude * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const deltaLatRad = (coord2.latitude - coord1.latitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const deltaLngRad = (coord2.longitude - coord1.longitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    
    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return radius * c;
  }
}