import { CityData } from '@/types/time';

export const MAJOR_CITIES: CityData[] = [
  // 亚洲
  {
    id: 'beijing',
    name: '北京',
    nameEn: 'Beijing',
    timezone: 'Asia/Shanghai',
    longitude: 116.4074,
    latitude: 39.9042,
    utcOffset: 8,
    country: '中国',
    countryCode: 'CN',
  },
  {
    id: 'tokyo',
    name: '东京',
    nameEn: 'Tokyo',
    timezone: 'Asia/Tokyo',
    longitude: 139.6503,
    latitude: 35.6762,
    utcOffset: 9,
    country: '日本',
    countryCode: 'JP',
  },
  {
    id: 'shanghai',
    name: '上海',
    nameEn: 'Shanghai',
    timezone: 'Asia/Shanghai',
    longitude: 121.4737,
    latitude: 31.2304,
    utcOffset: 8,
    country: '中国',
    countryCode: 'CN',
  },
  {
    id: 'singapore',
    name: '新加坡',
    nameEn: 'Singapore',
    timezone: 'Asia/Singapore',
    longitude: 103.8198,
    latitude: 1.3521,
    utcOffset: 8,
    country: '新加坡',
    countryCode: 'SG',
  },
  {
    id: 'mumbai',
    name: '孟买',
    nameEn: 'Mumbai',
    timezone: 'Asia/Kolkata',
    longitude: 72.8777,
    latitude: 19.0760,
    utcOffset: 5.5,
    country: '印度',
    countryCode: 'IN',
  },
  {
    id: 'dubai',
    name: '迪拜',
    nameEn: 'Dubai',
    timezone: 'Asia/Dubai',
    longitude: 55.2708,
    latitude: 25.2048,
    utcOffset: 4,
    country: '阿联酋',
    countryCode: 'AE',
  },
  
  // 欧洲
  {
    id: 'london',
    name: '伦敦',
    nameEn: 'London',
    timezone: 'Europe/London',
    longitude: -0.1278,
    latitude: 51.5074,
    utcOffset: 0,
    country: '英国',
    countryCode: 'GB',
  },
  {
    id: 'paris',
    name: '巴黎',
    nameEn: 'Paris',
    timezone: 'Europe/Paris',
    longitude: 2.3522,
    latitude: 48.8566,
    utcOffset: 1,
    country: '法国',
    countryCode: 'FR',
  },
  {
    id: 'berlin',
    name: '柏林',
    nameEn: 'Berlin',
    timezone: 'Europe/Berlin',
    longitude: 13.4050,
    latitude: 52.5200,
    utcOffset: 1,
    country: '德国',
    countryCode: 'DE',
  },
  {
    id: 'moscow',
    name: '莫斯科',
    nameEn: 'Moscow',
    timezone: 'Europe/Moscow',
    longitude: 37.6173,
    latitude: 55.7558,
    utcOffset: 3,
    country: '俄罗斯',
    countryCode: 'RU',
  },
  
  // 北美
  {
    id: 'new-york',
    name: '纽约',
    nameEn: 'New York',
    timezone: 'America/New_York',
    longitude: -74.0060,
    latitude: 40.7128,
    utcOffset: -5,
    country: '美国',
    countryCode: 'US',
  },
  {
    id: 'los-angeles',
    name: '洛杉矶',
    nameEn: 'Los Angeles',
    timezone: 'America/Los_Angeles',
    longitude: -118.2437,
    latitude: 34.0522,
    utcOffset: -8,
    country: '美国',
    countryCode: 'US',
  },
  {
    id: 'chicago',
    name: '芝加哥',
    nameEn: 'Chicago',
    timezone: 'America/Chicago',
    longitude: -87.6298,
    latitude: 41.8781,
    utcOffset: -6,
    country: '美国',
    countryCode: 'US',
  },
  {
    id: 'toronto',
    name: '多伦多',
    nameEn: 'Toronto',
    timezone: 'America/Toronto',
    longitude: -79.3832,
    latitude: 43.6532,
    utcOffset: -5,
    country: '加拿大',
    countryCode: 'CA',
  },
  
  // 南美
  {
    id: 'sao-paulo',
    name: '圣保罗',
    nameEn: 'São Paulo',
    timezone: 'America/Sao_Paulo',
    longitude: -46.6333,
    latitude: -23.5505,
    utcOffset: -3,
    country: '巴西',
    countryCode: 'BR',
  },
  
  // 大洋洲
  {
    id: 'sydney',
    name: '悉尼',
    nameEn: 'Sydney',
    timezone: 'Australia/Sydney',
    longitude: 151.2093,
    latitude: -33.8688,
    utcOffset: 10,
    country: '澳大利亚',
    countryCode: 'AU',
  },
  {
    id: 'melbourne',
    name: '墨尔本',
    nameEn: 'Melbourne',
    timezone: 'Australia/Melbourne',
    longitude: 144.9631,
    latitude: -37.8136,
    utcOffset: 10,
    country: '澳大利亚',
    countryCode: 'AU',
  },
  
  // 非洲
  {
    id: 'cairo',
    name: '开罗',
    nameEn: 'Cairo',
    timezone: 'Africa/Cairo',
    longitude: 31.2357,
    latitude: 30.0444,
    utcOffset: 2,
    country: '埃及',
    countryCode: 'EG',
  },
];

// 默认选中的城市（按需求文档中的12个主要城市）
export const DEFAULT_SELECTED_CITIES = [
  'beijing',
  'tokyo', 
  'sydney',
  'mumbai',
  'dubai',
  'moscow',
  'berlin',
  'london',
  'new-york',
  'los-angeles',
  'chicago',
  'sao-paulo',
];

// 获取城市数据的辅助函数
export const getCityById = (id: string): CityData | undefined => {
  return MAJOR_CITIES.find(city => city.id === id);
};

export const getCitiesByIds = (ids: string[]): CityData[] => {
  return ids.map(id => getCityById(id)).filter(Boolean) as CityData[];
};

export const getCitiesByTimezone = (timezone: string): CityData[] => {
  return MAJOR_CITIES.filter(city => city.timezone === timezone);
};