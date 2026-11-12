import { DateTime } from 'luxon';

export interface CityData {
  id: string;
  name: string;
  nameEn: string;
  timezone: string; // IANA时区标识
  longitude: number;
  latitude: number;
  utcOffset: number; // UTC偏移小时数
  country: string;
  countryCode: string;
}

export interface CityTimeData extends CityData {
  currentTime: DateTime;
  localDate: string;
  timeString: string;
  utcOffsetString: string;
  isDaytime: boolean;
}

export interface TimeState {
  // 基准时间
  beijingTime: DateTime;
  utcTime: DateTime;
  
  // 模式控制
  isRealTime: boolean;
  timeOffset: number; // 相对当前时间的偏移（分钟）
  
  // 城市时间
  cities: CityTimeData[];
  selectedCities: string[];
  
  // 显示设置
  is24HourFormat: boolean;
  showSeconds: boolean;
}

export interface TimeZoneInfo {
  id: string;
  name: string;
  utcOffset: number;
  dstOffset?: number;
  abbreviation: string;
}