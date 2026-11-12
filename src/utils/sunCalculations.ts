import { DateTime } from 'luxon';
import * as SunCalc from 'suncalc';
import { ASTRONOMICAL_CONSTANTS, EARTH_CONSTANTS } from '@data/constants';
import type { SunPosition, DayNightBoundary, SunlightData, Coordinates } from '@types/geography';

/**
 * 太阳位置计算工具类
 */
export class SunPositionCalculator {
  /**
   * 计算指定时间的太阳位置
   */
  static calculateSunPosition(dateTime: DateTime): SunPosition {
    const date = dateTime.toJSDate();
    const jd = this.getJulianDay(dateTime);
    const centuries = (jd - ASTRONOMICAL_CONSTANTS.JULIAN_DAY_J2000) / 36525.0;
    
    // 计算太阳几何平均经度
    const geomMeanLongSun = (280.46646 + centuries * (36000.76983 + centuries * 0.0003032)) % 360;
    
    // 计算太阳几何平均异常点
    const geomMeanAnomSun = 357.52911 + centuries * (35999.05029 - 0.0001537 * centuries);
    
    // 计算地球轨道偏心率
    const eccentEarth = 0.016708634 - centuries * (0.000042037 + 0.0000001267 * centuries);
    
    // 太阳中心方程
    const sunEq = Math.sin(this.toRadians(geomMeanAnomSun)) * (1.914602 - centuries * (0.004817 + 0.000014 * centuries)) +
                  Math.sin(this.toRadians(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * centuries) +
                  Math.sin(this.toRadians(3 * geomMeanAnomSun)) * 0.000289;
    
    // 太阳真实经度
    const sunTrueLong = geomMeanLongSun + sunEq;
    
    // 计算太阳赤纬角
    const obliqCorr = 23 + (26 + ((21.448 - centuries * (46.815 + centuries * (0.00059 - centuries * 0.001813)))) / 60) / 60;
    const declination = this.toDegrees(Math.asin(Math.sin(this.toRadians(obliqCorr)) * Math.sin(this.toRadians(sunTrueLong))));
    
    // 计算太阳经度（地理经度）
    const longitude = this.normalizeLongitude(sunTrueLong + 180);
    
    // 计算时角（基于格林威治均时）
    const hourAngle = this.calculateHourAngle(dateTime, longitude);
    
    return {
      declination,
      hourAngle,
      azimuth: this.calculateAzimuth(declination, hourAngle, 0), // 在赤道处的方位角
      altitude: this.calculateAltitude(declination, hourAngle, 0), // 在赤道处的高度角
      longitude,
      rightAscension: this.calculateRightAscension(sunTrueLong, obliqCorr),
    };
  }

  /**
   * 计算昼夜分界线
   */
  static calculateDayNightBoundary(sunPosition: SunPosition): DayNightBoundary {
    const points: Array<{ lat: number; lng: number }> = [];
    const { declination, longitude } = sunPosition;
    
    // 计算每个经度上的昼夜分界点
    for (let lng = -180; lng <= 180; lng += 2) {
      const hourAngle = this.normalizeLongitude(lng - longitude);
      
      // 计算该经度上日出日落时的纬度
      const latRad = Math.atan2(
        -Math.cos(this.toRadians(hourAngle)),
        Math.tan(this.toRadians(declination))
      );
      
      const lat = this.toDegrees(latRad);
      
      if (!isNaN(lat) && Math.abs(lat) <= 90) {
        points.push({ lat, lng });
      }
    }
    
    return {
      points,
      sunLongitude: longitude,
      isDaylight: (lat: number, lng: number) => {
        return this.isDaylight(lat, lng, sunPosition);
      }
    };
  }

  /**
   * 获取完整的太阳光照数据
   */
  static calculateSunlightData(dateTime: DateTime, latitude = 0, longitude = 0): SunlightData {
    const date = dateTime.toJSDate();
    const sunPosition = this.calculateSunPosition(dateTime);
    const dayNightBoundary = this.calculateDayNightBoundary(sunPosition);
    
    // 使用SunCalc库获取日出日落时间
    const sunTimes = SunCalc.getTimes(date, latitude, longitude);
    
    return {
      sunPosition,
      dayNightBoundary,
      sunriseTime: sunTimes.sunrise,
      sunsetTime: sunTimes.sunset,
      solarNoon: sunTimes.solarNoon,
    };
  }

  /**
   * 判断指定坐标在指定时间是否为白昼
   */
  static isDaylight(latitude: number, longitude: number, sunPosition: SunPosition): boolean {
    const hourAngle = this.normalizeLongitude(longitude - sunPosition.longitude);
    const altitude = this.calculateAltitude(sunPosition.declination, hourAngle, latitude);
    
    // 考虑大气折射，太阳高度角大于-0.833度时为白昼
    return altitude > -ASTRONOMICAL_CONSTANTS.ATMOSPHERIC_REFRACTION;
  }

  /**
   * 计算指定位置的太阳高度角
   */
  static calculateSunAltitude(
    latitude: number, 
    longitude: number, 
    dateTime: DateTime
  ): number {
    const sunPosition = this.calculateSunPosition(dateTime);
    const hourAngle = this.normalizeLongitude(longitude - sunPosition.longitude);
    return this.calculateAltitude(sunPosition.declination, hourAngle, latitude);
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

  private static normalizeLongitude(longitude: number): number {
    let normalized = longitude % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    return normalized;
  }

  private static calculateHourAngle(dateTime: DateTime, sunLongitude: number): number {
    const utc = dateTime.toUTC();
    const hours = utc.hour + utc.minute / 60 + utc.second / 3600;
    const hourAngle = (hours - 12) * 15; // 15度每小时
    return this.normalizeLongitude(hourAngle);
  }

  private static calculateAltitude(
    declination: number, 
    hourAngle: number, 
    latitude: number
  ): number {
    const decRad = this.toRadians(declination);
    const latRad = this.toRadians(latitude);
    const haRad = this.toRadians(hourAngle);
    
    const altitude = Math.asin(
      Math.sin(decRad) * Math.sin(latRad) + 
      Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad)
    );
    
    return this.toDegrees(altitude);
  }

  private static calculateAzimuth(
    declination: number, 
    hourAngle: number, 
    latitude: number
  ): number {
    const decRad = this.toRadians(declination);
    const latRad = this.toRadians(latitude);
    const haRad = this.toRadians(hourAngle);
    
    const azimuth = Math.atan2(
      Math.sin(haRad),
      Math.cos(haRad) * Math.sin(latRad) - Math.tan(decRad) * Math.cos(latRad)
    );
    
    return this.normalizeLongitude(this.toDegrees(azimuth) + 180);
  }

  private static calculateRightAscension(sunTrueLong: number, obliqCorr: number): number {
    const ra = Math.atan2(
      Math.cos(this.toRadians(obliqCorr)) * Math.sin(this.toRadians(sunTrueLong)),
      Math.cos(this.toRadians(sunTrueLong))
    );
    return this.toDegrees(ra);
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
    radius = EARTH_CONSTANTS.RADIUS_3D
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
    z: number, 
    radius = EARTH_CONSTANTS.RADIUS_3D
  ): Coordinates {
    const r = Math.sqrt(x * x + y * y + z * z);
    const latitude = 90 - Math.acos(y / r) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES;
    const longitude = Math.atan2(z, -x) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES - 180;
    
    return {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude: Math.max(-180, Math.min(180, longitude))
    };
  }

  /**
   * 计算两点间的大圆距离
   */
  static calculateDistance(
    coord1: Coordinates, 
    coord2: Coordinates, 
    radius = EARTH_CONSTANTS.RADIUS
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