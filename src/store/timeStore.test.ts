import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTime } from 'luxon';
import { BASE_ZONE } from '@data/constants';
import { useTimeStore } from './timeStore';

// 2026-11-12 20:00 UTC = 洛杉矶 12:00 PST
const NOW = DateTime.fromISO('2026-11-12T20:00:00Z');

describe('timeStore 基准时区与偏移语义', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW.toJSDate());
    useTimeStore.getState().resetToRealTime();
  });

  afterEach(() => {
    useTimeStore.getState().stopRealTimeMode();
    vi.useRealTimers();
  });

  it('基准时间使用洛杉矶时区', () => {
    const { baseTime } = useTimeStore.getState();

    expect(baseTime.zoneName).toBe(BASE_ZONE.timezone);
    expect(baseTime.toFormat('HH:mm')).toBe('12:00');
  });

  it('实时模式下每秒走动', () => {
    vi.advanceTimersByTime(5000);

    const { baseTime, isRealTime } = useTimeStore.getState();
    expect(isRealTime).toBe(true);
    expect(baseTime.toFormat('HH:mm:ss')).toBe('12:00:05');
  });

  it('偏移相对冻结的锚点，隔一会儿再调不会跳变', () => {
    useTimeStore.getState().setTimeOffset(60);
    expect(useTimeStore.getState().baseTime.toFormat('HH:mm:ss')).toBe(
      '13:00:00'
    );

    // 真实时间过去 10 分钟后再调 1 分钟，只应前进 1 分钟
    vi.advanceTimersByTime(10 * 60 * 1000);
    useTimeStore.getState().setTimeOffset(61);

    const { baseTime, isRealTime } = useTimeStore.getState();
    expect(isRealTime).toBe(false);
    expect(baseTime.toFormat('HH:mm:ss')).toBe('13:01:00');
  });

  it('偏移限制在 ±24 小时', () => {
    useTimeStore.getState().setTimeOffset(5000);
    expect(useTimeStore.getState().timeOffset).toBe(1440);

    useTimeStore.getState().setTimeOffset(-5000);
    expect(useTimeStore.getState().timeOffset).toBe(-1440);
  });

  it('暂停后冻结，恢复实时时偏移归零并回到当前时刻', () => {
    useTimeStore.getState().toggleRealTime();
    vi.advanceTimersByTime(30 * 1000);
    expect(useTimeStore.getState().baseTime.toFormat('HH:mm:ss')).toBe(
      '12:00:00'
    );

    useTimeStore.getState().setTimeOffset(120);
    useTimeStore.getState().toggleRealTime();

    const { baseTime, isRealTime, timeOffset, anchorTime } =
      useTimeStore.getState();
    expect(isRealTime).toBe(true);
    expect(timeOffset).toBe(0);
    expect(anchorTime).toBeNull();
    expect(baseTime.toFormat('HH:mm:ss')).toBe('12:00:30');
  });

  it('偏移按经过的时间计，跨夏令时切换不出错', () => {
    // 2026-03-08 是洛杉矶夏令时开始日：01:30 PST 之后 1 小时是 03:30 PDT
    vi.setSystemTime(DateTime.fromISO('2026-03-08T09:30:00Z').toJSDate());
    useTimeStore.getState().resetToRealTime();
    expect(useTimeStore.getState().baseTime.toFormat('HH:mm ZZ')).toBe(
      '01:30 -08:00'
    );

    useTimeStore.getState().setTimeOffset(60);
    expect(useTimeStore.getState().baseTime.toFormat('HH:mm ZZ')).toBe(
      '03:30 -07:00'
    );
  });

  it('各城市时间由基准时刻换算', () => {
    const { cities } = useTimeStore.getState();
    const byId = Object.fromEntries(cities.map(city => [city.id, city]));

    expect(byId['los-angeles'].currentTime.toFormat('MM-dd HH:mm')).toBe(
      '11-12 12:00'
    );
    expect(byId['beijing'].currentTime.toFormat('MM-dd HH:mm')).toBe(
      '11-13 04:00'
    );
    expect(byId['new-york'].currentTime.toFormat('MM-dd HH:mm')).toBe(
      '11-12 15:00'
    );
  });

  it('城市昼夜由太阳位置决定', () => {
    // 洛杉矶正午：洛杉矶、纽约是白天；北京凌晨 4 点、东京凌晨 5 点是夜晚
    const { cities } = useTimeStore.getState();
    const isDaytime = Object.fromEntries(
      cities.map(city => [city.id, city.isDaytime])
    );

    expect(isDaytime['los-angeles']).toBe(true);
    expect(isDaytime['new-york']).toBe(true);
    expect(isDaytime['beijing']).toBe(false);
    expect(isDaytime['tokyo']).toBe(false);
  });

  it('已选城市列表写入 localStorage，时间状态不写入', () => {
    useTimeStore.getState().removeCity('sydney');

    const stored = JSON.parse(
      localStorage.getItem('world-time-cities') ?? '{}'
    );
    expect(stored.state.selectedCities).not.toContain('sydney');
    expect(stored.state.selectedCities).toContain('los-angeles');
    expect(Object.keys(stored.state)).toEqual(['selectedCities']);

    useTimeStore.getState().addCity('sydney');
  });
});
