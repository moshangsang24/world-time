import { DateTime } from 'luxon';

export interface CityData {
  id: string;
  name: string;
  nameEn: string;
  timezone: string; // IANA时区标识
  longitude: number;
  latitude: number;
  utcOffset?: number; // 标准时 UTC 偏移（小时），仅作参考；自定义城市没有
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

export interface BaseZone {
  timezone: string; // IANA 时区
  label: string; // 界面文案，如"洛杉矶时间"
  cityId: string | null; // 对应的城市；跟随设备且列表里没有同时区城市时为 null
}

export interface TimeState {
  // 基准时区与基准时间（baseZone 时区下的当前展示时刻）
  baseZone: BaseZone;
  baseTime: DateTime;
  baseCityId: string; // 用户选定的基准城市
  followDeviceZone: boolean; // 打开后基准跟随设备时区

  // 模式控制
  isRealTime: boolean;
  timeOffset: number; // 相对 anchorTime 的偏移（分钟，按经过的时间计）
  anchorTime: DateTime | null; // 离开实时模式时冻结的时刻；实时模式下为 null
  
  // 城市时间
  cities: CityTimeData[];
  selectedCities: string[];
  customCities: CityData[]; // 通过搜索添加的、不在 MAJOR_CITIES 里的城市
  
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