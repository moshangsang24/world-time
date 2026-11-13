import { afterEach, describe, expect, it, vi } from 'vitest';
import { CitySearchError, searchCities, toSearchResult } from './geocoding';

const SAMPLE = {
  results: [
    {
      id: 1795565,
      name: '深圳',
      latitude: 22.54554,
      longitude: 114.0683,
      timezone: 'Asia/Shanghai',
      country: '中国',
      country_code: 'CN',
      admin1: '广东',
    },
    // 没有时区的结果应被丢弃
    { id: 1, name: '无时区', latitude: 0, longitude: 0 },
  ],
};

const mockFetch = (response: Partial<Response> | Error) => {
  const fetchMock = vi.fn((_url: string) =>
    response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response as Response)
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('searchCities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('把接口结果转换成城市数据', async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: () => Promise.resolve(SAMPLE),
    });

    const results = await searchCities(' 深圳 ');

    expect(results).toEqual([
      {
        city: {
          id: 'custom-1795565',
          name: '深圳',
          nameEn: '深圳',
          timezone: 'Asia/Shanghai',
          latitude: 22.54554,
          longitude: 114.0683,
          country: '中国',
          countryCode: 'CN',
        },
        region: '广东',
      },
    ]);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.hostname).toBe('geocoding-api.open-meteo.com');
    expect(url.searchParams.get('name')).toBe('深圳');
    expect(url.searchParams.get('language')).toBe('zh');
  });

  it('没有结果时返回空数组', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({}) });
    expect(await searchCities('zzzz')).toEqual([]);
  });

  it('空查询不发请求', async () => {
    const fetchMock = mockFetch({ ok: true });
    expect(await searchCities('   ')).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('网络失败和接口报错都抛出 CitySearchError', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await expect(searchCities('深圳')).rejects.toBeInstanceOf(CitySearchError);

    mockFetch({ ok: false, status: 503 });
    await expect(searchCities('深圳')).rejects.toThrow('503');
  });
});

describe('toSearchResult', () => {
  it('省 / 州与城市同名时不重复显示', () => {
    const result = toSearchResult({
      id: 2,
      name: '北京',
      latitude: 39.9,
      longitude: 116.4,
      timezone: 'Asia/Shanghai',
      admin1: '北京',
    });
    expect(result?.region).toBeNull();
  });

  it('无效时区的结果丢弃', () => {
    expect(
      toSearchResult({
        id: 3,
        name: 'X',
        latitude: 0,
        longitude: 0,
        timezone: 'Not/AZone',
      })
    ).toBeNull();
  });
});
