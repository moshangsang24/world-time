import { DateTime } from 'luxon';
import { TIME_CONSTANTS } from '@data/constants';
import type { CityData, CityTimeData } from '@/types/time';
import { SunPositionCalculator } from './sunCalculations';

/**
 * 时间格式化工具函数
 */
export class TimeFormatter {
  /**
   * 时区缩写，如 PST / PDT。固定用 en-US，否则中文环境下会得到 GMT-8。
   */
  static formatZoneAbbr(dateTime: DateTime): string {
    return dateTime.setLocale('en-US').toFormat('ZZZZ');
  }

  /**
   * 格式化时间字符串
   */
  static formatTime(
    dateTime: DateTime, 
    format: '12h' | '24h' = '24h', 
    showSeconds = true
  ): string {
    const timeFormat = format === '12h' 
      ? (showSeconds ? 'h:mm:ss a' : 'h:mm a')
      : (showSeconds ? 'HH:mm:ss' : 'HH:mm');
    
    return dateTime.toFormat(timeFormat);
  }

  /**
   * 格式化日期字符串
   */
  static formatDate(dateTime: DateTime, locale = 'zh'): string {
    return locale === 'zh' 
      ? dateTime.toFormat('yyyy年MM月dd日')
      : dateTime.toFormat('MMM dd, yyyy');
  }

  /**
   * 格式化UTC偏移
   */
  static formatUtcOffset(dateTime: DateTime): string {
    const offset = dateTime.offset;
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const sign = offset >= 0 ? '+' : '-';
    
    if (minutes === 0) {
      return `UTC${sign}${hours}`;
    }
    return `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化时差（相对于基准时间）
   */
  static formatTimeDifference(
    targetTime: DateTime, 
    baseTime: DateTime
  ): string {
    const diffMinutes = targetTime.diff(baseTime, 'minutes').minutes;
    const hours = Math.floor(Math.abs(diffMinutes) / 60);
    const minutes = Math.abs(diffMinutes) % 60;
    
    if (diffMinutes === 0) return '同时';
    
    const sign = diffMinutes > 0 ? '+' : '-';
    const hoursStr = hours > 0 ? `${hours}小时` : '';
    const minutesStr = minutes > 0 ? `${minutes}分钟` : '';
    
    return `${sign}${hoursStr}${minutesStr}`;
  }
}

/**
 * 时间计算工具类
 */
export class TimeCalculator {
  /**
   * 将城市数据转换为城市时间数据
   */
  static createCityTimeData(
    cityData: CityData, 
    baseTime: DateTime,
    options: {
      format?: '12h' | '24h';
      showSeconds?: boolean;
      locale?: string;
    } = {}
  ): CityTimeData {
    const { format = '24h', showSeconds = true, locale = 'zh' } = options;
    const cityTime = baseTime.setZone(cityData.timezone);
    
    return {
      ...cityData,
      currentTime: cityTime,
      localDate: TimeFormatter.formatDate(cityTime, locale),
      timeString: TimeFormatter.formatTime(cityTime, format, showSeconds),
      utcOffsetString: TimeFormatter.formatUtcOffset(cityTime),
      isDaytime: SunPositionCalculator.isDaylight(
        cityData.latitude,
        cityData.longitude,
        SunPositionCalculator.calculateSunPosition(cityTime)
      ),
    };
  }

  /**
   * 批量转换城市时间数据
   */
  static createCityTimesData(
    cities: CityData[], 
    baseTime: DateTime,
    options?: Parameters<typeof TimeCalculator.createCityTimeData>[2]
  ): CityTimeData[] {
    return cities.map(city => this.createCityTimeData(city, baseTime, options));
  }

  /**
   * 获取指定偏移后的时间
   */
  static getTimeWithOffset(baseTime: DateTime, offsetMinutes: number): DateTime {
    return baseTime.plus({ minutes: offsetMinutes });
  }

  /**
   * 计算时区偏移量（分钟）
   */
  static getTimezoneOffset(timezone: string, date = DateTime.now()): number {
    return date.setZone(timezone).offset;
  }

  /**
   * 计算两个时间之间的差值
   */
  static getTimeDifference(
    time1: DateTime, 
    time2: DateTime, 
    unit: 'minutes' | 'hours' | 'days' = 'minutes'
  ): number {
    return time1.diff(time2, unit).as(unit);
  }

  /**
   * 获取时区列表（按UTC偏移排序）
   */
  static getSortedTimezones(cities: CityData[]): Array<{
    timezone: string;
    offset: number;
    cities: CityData[];
  }> {
    const timezoneMap = new Map<string, { offset: number; cities: CityData[] }>();
    
    cities.forEach(city => {
      if (!timezoneMap.has(city.timezone)) {
        timezoneMap.set(city.timezone, {
          offset: city.utcOffset,
          cities: []
        });
      }
      timezoneMap.get(city.timezone)!.cities.push(city);
    });

    return Array.from(timezoneMap.entries())
      .map(([timezone, data]) => ({
        timezone,
        offset: data.offset,
        cities: data.cities,
      }))
      .sort((a, b) => a.offset - b.offset);
  }

  /**
   * 验证时间偏移量是否在有效范围内
   */
  static validateTimeOffset(offset: number): number {
    return Math.max(
      -TIME_CONSTANTS.MINUTES_PER_DAY, 
      Math.min(TIME_CONSTANTS.MINUTES_PER_DAY, offset)
    );
  }

  /**
   * 获取当天的开始和结束时间
   */
  static getDayBoundaries(dateTime: DateTime): {
    startOfDay: DateTime;
    endOfDay: DateTime;
  } {
    return {
      startOfDay: dateTime.startOf('day'),
      endOfDay: dateTime.endOf('day'),
    };
  }
}

/**
 * 时间验证工具
 */
export class TimeValidator {
  /**
   * 验证时区字符串是否有效
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      DateTime.now().setZone(timezone);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 验证日期时间对象是否有效
   */
  static isValidDateTime(dateTime: DateTime): boolean {
    return dateTime.isValid;
  }

  /**
   * 验证坐标是否有效
   */
  static isValidCoordinates(latitude: number, longitude: number): boolean {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /**
   * 验证时间偏移量是否合理
   */
  static isValidTimeOffset(offset: number): boolean {
    return offset >= -TIME_CONSTANTS.MINUTES_PER_DAY && 
           offset <= TIME_CONSTANTS.MINUTES_PER_DAY;
  }
}