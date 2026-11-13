import type { CityData } from '@/types/time';
import { TimeCalculator } from './timeCalculations';

// 城市搜索使用 Open-Meteo 地理编码接口：免费、无需 key、支持中文。
// 注意：搜索词会发送到该服务；添加后的城市数据保存在本地，之后不再联网。
// 文档：https://open-meteo.com/en/docs/geocoding-api
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** 自定义城市 id 的前缀，避免与 MAJOR_CITIES 冲突 */
export const CUSTOM_CITY_PREFIX = 'custom-';

export interface CitySearchResult {
  city: CityData;
  region: string | null; // 省 / 州，用来区分重名城市
}

interface OpenMeteoPlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
}

interface OpenMeteoResponse {
  results?: OpenMeteoPlace[];
}

export class CitySearchError extends Error {}

/** 把接口返回的一条地点转换成城市数据；缺少有效时区的丢弃 */
export const toSearchResult = (
  place: OpenMeteoPlace
): CitySearchResult | null => {
  if (
    !place.timezone ||
    !TimeCalculator.isValidTimeZone(place.timezone) ||
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude)
  ) {
    return null;
  }

  return {
    city: {
      id: `${CUSTOM_CITY_PREFIX}${place.id}`,
      name: place.name,
      nameEn: place.name,
      timezone: place.timezone,
      latitude: place.latitude,
      longitude: place.longitude,
      country: place.country ?? '',
      countryCode: place.country_code ?? '',
    },
    region:
      place.admin1 && place.admin1 !== place.name ? place.admin1 : null,
  };
};

/**
 * 按名称搜索城市。query 为空时直接返回空数组。
 * 网络失败或接口报错时抛出 CitySearchError；被 signal 取消时抛出 AbortError。
 */
export const searchCities = async (
  query: string,
  signal?: AbortSignal
): Promise<CitySearchResult[]> => {
  const name = query.trim();
  if (!name) return [];

  const params = new URLSearchParams({
    name,
    count: '10',
    language: 'zh',
    format: 'json',
  });

  let response: Response;
  try {
    response = await fetch(`${GEOCODING_URL}?${params}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new CitySearchError('网络连接失败');
  }

  if (!response.ok) {
    throw new CitySearchError(`搜索服务返回错误（${response.status}）`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  return (data.results ?? [])
    .map(toSearchResult)
    .filter((result): result is CitySearchResult => result !== null);
};
