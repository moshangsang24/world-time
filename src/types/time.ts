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
  // 基准时间（BASE_ZONE 时区下的当前展示时刻）
  baseTime: DateTime;

  // 模式控制
  isRealTime: boolean;
  timeOffset: number; // 相对 anchorTime 的偏移（分钟，按经过的时间计）
  anchorTime: DateTime | null; // 离开实时模式时冻结的时刻；实时模式下为 null
  
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