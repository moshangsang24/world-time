import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateTime } from 'luxon';
import { DEFAULT_SELECTED_CITIES } from '@data/cities';
import { TimeCalculator } from '@utils/timeCalculations';
import type { CityData } from '@/types/time';
import { resolveBaseZone, useTimeStore } from './timeStore';

// 2026-11-12 20:00 UTC = 洛杉矶 12:00 PST
const NOW = DateTime.fromISO('2026-11-12T20:00:00Z');

describe('timeStore 基准时区与偏移语义', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW.toJSDate());
    // 每个用例从默认城市列表和默认基准开始
    useTimeStore.setState({
      selectedCities: DEFAULT_SELECTED_CITIES,
      customCities: [],
      baseCityId: 'los-angeles',
      followDeviceZone: false,
    });
    useTimeStore.getState().applyBaseZone();
    useTimeStore.getState().resetToRealTime();
  });

  afterEach(() => {
    useTimeStore.getState().stopRealTimeMode();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('基准时间使用洛杉矶时区', () => {
    const { baseTime } = useTimeStore.getState();

    expect(baseTime.zoneName).toBe('America/Los_Angeles');
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

  it('城市列表与基准设置写入 localStorage，时间状态不写入', () => {
    useTimeStore.getState().removeCity('sydney');

    const stored = JSON.parse(
      localStorage.getItem('world-time-cities') ?? '{}'
    );
    expect(stored.state.selectedCities).not.toContain('sydney');
    expect(stored.state.selectedCities).toContain('los-angeles');
    expect(Object.keys(stored.state).sort()).toEqual([
      'baseCityId',
      'customCities',
      'followDeviceZone',
      'selectedCities',
    ]);

    useTimeStore.getState().addCity('sydney');
  });
});

// 通过搜索添加的城市（示例：奥斯汀）
const AUSTIN: CityData = {
  id: 'custom-4671654',
  name: '奥斯汀',
  nameEn: '奥斯汀',
  timezone: 'America/Chicago',
  latitude: 30.26715,
  longitude: -97.74306,
  country: '美国',
  countryCode: 'US',
};

describe('timeStore 切换基准', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW.toJSDate());
    useTimeStore.setState({
      selectedCities: DEFAULT_SELECTED_CITIES,
      customCities: [],
      baseCityId: 'los-angeles',
      followDeviceZone: false,
    });
    useTimeStore.getState().applyBaseZone();
    useTimeStore.getState().resetToRealTime();
  });

  afterEach(() => {
    useTimeStore.getState().stopRealTimeMode();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('设为东京后，基准时区和文案都变，时刻不变', () => {
    const before = useTimeStore.getState().baseTime.toMillis();
    useTimeStore.getState().setBaseCity('tokyo');

    const { baseZone, baseTime } = useTimeStore.getState();
    expect(baseZone).toEqual({
      timezone: 'Asia/Tokyo',
      label: '东京时间',
      cityId: 'tokyo',
    });
    expect(baseTime.zoneName).toBe('Asia/Tokyo');
    expect(baseTime.toMillis()).toBe(before);
    expect(baseTime.toFormat('MM-dd HH:mm')).toBe('11-13 05:00');
  });

  it('暂停和偏移在切换基准后保留', () => {
    useTimeStore.getState().setTimeOffset(90);
    useTimeStore.getState().setBaseCity('london');

    const { isRealTime, timeOffset, baseTime, anchorTime } =
      useTimeStore.getState();
    expect(isRealTime).toBe(false);
    expect(timeOffset).toBe(90);
    expect(baseTime.toFormat('HH:mm')).toBe('21:30');
    expect(anchorTime?.zoneName).toBe('Europe/London');
  });

  it('设为基准的城市不在列表里时会先加入', () => {
    useTimeStore.getState().setBaseCity('paris');

    expect(useTimeStore.getState().selectedCities).toContain('paris');
    expect(useTimeStore.getState().baseZone.cityId).toBe('paris');
  });

  it('基准城市不能移除，列表至少保留一个城市', () => {
    useTimeStore.getState().removeCity('los-angeles');
    expect(useTimeStore.getState().selectedCities).toContain('los-angeles');

    useTimeStore.getState().setSelectedCities(['los-angeles']);
    useTimeStore.getState().removeCity('los-angeles');
    expect(useTimeStore.getState().selectedCities).toEqual(['los-angeles']);
  });

  it('跟随设备：列表里有同时区城市时用它', () => {
    vi.spyOn(TimeCalculator, 'getDeviceTimeZone').mockReturnValue(
      'Asia/Tokyo'
    );
    useTimeStore.getState().setFollowDeviceZone(true);

    expect(useTimeStore.getState().baseZone).toEqual({
      timezone: 'Asia/Tokyo',
      label: '东京时间',
      cityId: 'tokyo',
    });
  });

  it('跟随设备：时区别名也能认出同一个城市', () => {
    // Asia/Chongqing 是 Asia/Shanghai 的别名
    vi.spyOn(TimeCalculator, 'getDeviceTimeZone').mockReturnValue(
      'Asia/Chongqing'
    );
    useTimeStore.getState().setFollowDeviceZone(true);

    expect(useTimeStore.getState().baseZone.cityId).toBe('beijing');
  });

  it('跟随设备：没有同时区城市时显示本机时间', () => {
    vi.spyOn(TimeCalculator, 'getDeviceTimeZone').mockReturnValue(
      'Pacific/Auckland'
    );
    useTimeStore.getState().setFollowDeviceZone(true);

    const { baseZone, baseTime } = useTimeStore.getState();
    expect(baseZone).toEqual({
      timezone: 'Pacific/Auckland',
      label: '本机时间',
      cityId: null,
    });
    expect(baseTime.zoneName).toBe('Pacific/Auckland');
  });

  it('跟随设备时，手动设基准会关闭跟随', () => {
    vi.spyOn(TimeCalculator, 'getDeviceTimeZone').mockReturnValue(
      'Asia/Tokyo'
    );
    useTimeStore.getState().setFollowDeviceZone(true);
    useTimeStore.getState().setBaseCity('dubai');

    expect(useTimeStore.getState().followDeviceZone).toBe(false);
    expect(useTimeStore.getState().baseZone.cityId).toBe('dubai');
  });

  it('跟随设备时，设备时区变化会在下一次走秒时生效', () => {
    const spy = vi
      .spyOn(TimeCalculator, 'getDeviceTimeZone')
      .mockReturnValue('Asia/Tokyo');
    useTimeStore.getState().setFollowDeviceZone(true);
    useTimeStore.getState().resetToRealTime();

    spy.mockReturnValue('Europe/London');
    vi.advanceTimersByTime(1000);

    expect(useTimeStore.getState().baseZone.cityId).toBe('london');
  });
});

describe('timeStore 自定义城市', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW.toJSDate());
    useTimeStore.setState({
      selectedCities: DEFAULT_SELECTED_CITIES,
      customCities: [],
      baseCityId: 'los-angeles',
      followDeviceZone: false,
    });
    useTimeStore.getState().applyBaseZone();
  });

  afterEach(() => {
    useTimeStore.getState().stopRealTimeMode();
    vi.useRealTimers();
  });

  it('添加后出现在城市列表里，时间和昼夜正常计算', () => {
    useTimeStore.getState().addCustomCity(AUSTIN);

    const austin = useTimeStore
      .getState()
      .cities.find(city => city.id === AUSTIN.id);
    expect(austin?.currentTime.toFormat('HH:mm')).toBe('14:00');
    expect(austin?.isDaytime).toBe(true);
  });

  it('自定义城市可以设为基准', () => {
    useTimeStore.getState().addCustomCity(AUSTIN);
    useTimeStore.getState().setBaseCity(AUSTIN.id);

    expect(useTimeStore.getState().baseZone).toEqual({
      timezone: 'America/Chicago',
      label: '奥斯汀时间',
      cityId: AUSTIN.id,
    });
  });

  it('重复添加不会出现两次；移除后数据一并删除', () => {
    useTimeStore.getState().addCustomCity(AUSTIN);
    useTimeStore.getState().addCustomCity(AUSTIN);
    expect(
      useTimeStore.getState().selectedCities.filter(id => id === AUSTIN.id)
    ).toHaveLength(1);

    useTimeStore.getState().removeCity(AUSTIN.id);
    expect(useTimeStore.getState().customCities).toEqual([]);
    expect(useTimeStore.getState().selectedCities).not.toContain(AUSTIN.id);
  });

  it('自定义城市和基准设置写入 localStorage', () => {
    useTimeStore.getState().addCustomCity(AUSTIN);
    useTimeStore.getState().setBaseCity('tokyo');

    const stored = JSON.parse(
      localStorage.getItem('world-time-cities') ?? '{}'
    ).state;
    expect(stored.customCities).toEqual([AUSTIN]);
    expect(stored.selectedCities).toContain(AUSTIN.id);
    expect(stored.baseCityId).toBe('tokyo');
    expect(stored.followDeviceZone).toBe(false);
  });

  it('刷新后恢复：丢弃无效数据，基准城市不存在时退回洛杉矶', async () => {
    localStorage.setItem(
      'world-time-cities',
      JSON.stringify({
        state: {
          selectedCities: ['tokyo', AUSTIN.id, 'not-a-city'],
          customCities: [AUSTIN, { id: 'custom-bad', timezone: 'Mars/Base' }],
          baseCityId: 'custom-removed',
          followDeviceZone: false,
        },
        version: 0,
      })
    );
    await useTimeStore.persist.rehydrate();

    const state = useTimeStore.getState();
    expect(state.selectedCities).toEqual(['tokyo', AUSTIN.id]);
    expect(state.customCities).toEqual([AUSTIN]);
    expect(state.baseZone.cityId).toBe('los-angeles');
    expect(state.baseTime.zoneName).toBe('America/Los_Angeles');
  });
});

describe('resolveBaseZone', () => {
  it('手动模式下用 baseCityId 指向的城市', () => {
    expect(
      resolveBaseZone({
        baseCityId: 'sydney',
        followDeviceZone: false,
        selectedCities: ['sydney'],
        customCities: [],
      })
    ).toEqual({
      timezone: 'Australia/Sydney',
      label: '悉尼时间',
      cityId: 'sydney',
    });
  });
});
