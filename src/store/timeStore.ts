import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { DateTime } from 'luxon';
import type {
  BaseZone,
  TimeState,
  CityData,
  CityTimeData,
} from '@/types/time';
import type { SunPosition } from '@/types/geography';
import { SunPositionCalculator } from '@utils/sunCalculations';
import { TimeCalculator } from '@utils/timeCalculations';
import { DEFAULT_SELECTED_CITIES, getCityById } from '@data/cities';
import {
  DEFAULT_BASE_CITY_ID,
  TIME_CONSTANTS,
  UI_CONSTANTS,
} from '@data/constants';

interface TimeActions {
  // 时间控制
  setTimeOffset: (offset: number) => void;
  resetToRealTime: () => void;
  toggleRealTime: () => void;

  // 城市管理
  addCity: (cityId: string) => void;
  addCustomCity: (city: CityData) => void;
  removeCity: (cityId: string) => void;
  setSelectedCities: (cityIds: string[]) => void;

  // 基准
  setBaseCity: (cityId: string) => void;
  setFollowDeviceZone: (follow: boolean) => void;

  // 设置
  setTimeFormat: (is24Hour: boolean) => void;
  setShowSeconds: (show: boolean) => void;

  // 内部方法
  applyBaseZone: () => void;
  updateCityTimes: () => void;
  startRealTimeMode: () => void;
  stopRealTimeMode: () => void;
}

type TimeStore = TimeState & TimeActions;

/** 先查预置城市，再查自定义城市 */
const findCity = (
  cityId: string,
  customCities: CityData[]
): CityData | undefined =>
  getCityById(cityId) ?? customCities.find(city => city.id === cityId);

const resolveCities = (
  cityIds: string[],
  customCities: CityData[]
): CityData[] =>
  cityIds
    .map(id => findCity(id, customCities))
    .filter((city): city is CityData => Boolean(city));

const DEFAULT_BASE_CITY = getCityById(DEFAULT_BASE_CITY_ID)!;

const cityLabel = (city: CityData) => `${city.name}时间`;

/**
 * 由用户设置推出当前基准。
 * - 手动模式：用 baseCityId 指向的城市；城市不存在时退回默认。
 * - 跟随设备：用设备时区；列表里有同时区城市时把它当基准城市
 *   （优先用户选过的那个），没有就只显示"本机时间"。
 */
export const resolveBaseZone = (
  state: Pick<
    TimeState,
    'baseCityId' | 'followDeviceZone' | 'selectedCities' | 'customCities'
  >
): BaseZone => {
  if (state.followDeviceZone) {
    const timezone = TimeCalculator.getDeviceTimeZone();
    const deviceNow = DateTime.now().setZone(timezone);
    const sameZone = resolveCities(
      state.selectedCities,
      state.customCities
    ).filter(city => {
      if (city.timezone === timezone) return true;
      // 别名时区（如 Asia/Chongqing 与 Asia/Shanghai）按当前偏移和规则名都相同来认
      const cityNow = deviceNow.setZone(city.timezone);
      return (
        cityNow.offset === deviceNow.offset &&
        cityNow.offsetNameLong === deviceNow.offsetNameLong
      );
    });
    const city =
      sameZone.find(candidate => candidate.id === state.baseCityId) ??
      sameZone[0];

    return city
      ? { timezone: city.timezone, label: cityLabel(city), cityId: city.id }
      : { timezone, label: '本机时间', cityId: null };
  }

  const city =
    findCity(state.baseCityId, state.customCities) ?? DEFAULT_BASE_CITY;
  return { timezone: city.timezone, label: cityLabel(city), cityId: city.id };
};

// 计算城市时间数据。昼夜在这里统一计算，所有组件读到的是同一份结果。
const calculateCityTime = (
  cityData: CityData,
  baseTime: DateTime,
  sunPosition: SunPosition
): CityTimeData => {
  const cityTime = baseTime.setZone(cityData.timezone);

  return {
    ...cityData,
    currentTime: cityTime,
    localDate: cityTime.toFormat('yyyy-MM-dd'),
    timeString: cityTime.toFormat('HH:mm:ss'),
    utcOffsetString: cityTime.toFormat('ZZ'),
    isDaytime: SunPositionCalculator.isDaylight(
      cityData.latitude,
      cityData.longitude,
      sunPosition
    ),
  };
};

// 实时更新定时器
let realTimeInterval: ReturnType<typeof setInterval> | null = null;

// 持久化城市列表与基准设置；时间相关状态每次加载都从"现在"开始
const STORAGE_KEY = 'world-time-cities';

type PersistedState = Pick<
  TimeState,
  'selectedCities' | 'customCities' | 'baseCityId' | 'followDeviceZone'
>;

const initialPreferences: PersistedState = {
  selectedCities: DEFAULT_SELECTED_CITIES,
  customCities: [],
  baseCityId: DEFAULT_BASE_CITY_ID,
  followDeviceZone: false,
};
const initialBaseZone = resolveBaseZone(initialPreferences);

export const useTimeStore = create<TimeStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => {
        const nowInBaseZone = () =>
          DateTime.now().setZone(get().baseZone.timezone);

        return {
          // 初始状态
          ...initialPreferences,
          baseZone: initialBaseZone,
          baseTime: DateTime.now().setZone(initialBaseZone.timezone),
          isRealTime: true,
          timeOffset: 0,
          anchorTime: null,
          cities: [],
          is24HourFormat: true,
          showSeconds: true,

          // 时间控制方法
          // 偏移相对"离开实时模式那一刻"冻结的锚点计算，而不是每次取 now，
          // 这样隔一会儿再滚动不会跳变。偏移是经过的分钟数，跨夏令时切换也正确。
          setTimeOffset: (offset: number) => {
            const limit = TIME_CONSTANTS.MINUTES_PER_DAY;
            const clampedOffset = Math.max(-limit, Math.min(limit, offset));
            const anchorTime = get().anchorTime ?? nowInBaseZone();

            get().stopRealTimeMode();
            set({
              anchorTime,
              timeOffset: clampedOffset,
              baseTime: anchorTime.plus({ minutes: clampedOffset }),
              isRealTime: false,
            });

            get().updateCityTimes();
          },

          resetToRealTime: () => {
            set({
              timeOffset: 0,
              anchorTime: null,
              isRealTime: true,
              baseTime: nowInBaseZone(),
            });

            get().updateCityTimes();
            get().startRealTimeMode();
          },

          // 实时 → 暂停：冻结在当前时刻；暂停 → 实时：偏移归零并恢复走动
          toggleRealTime: () => {
            if (get().isRealTime) {
              get().setTimeOffset(0);
            } else {
              get().resetToRealTime();
            }
          },

          // 城市管理方法
          addCity: (cityId: string) => {
            const { selectedCities, customCities } = get();
            if (
              selectedCities.includes(cityId) ||
              !findCity(cityId, customCities)
            ) {
              return;
            }
            set({ selectedCities: [...selectedCities, cityId] });
            get().applyBaseZone();
          },

          // 搜索得到的城市：先记下城市数据，再加入列表
          addCustomCity: (city: CityData) => {
            if (!getCityById(city.id)) {
              set(state => ({
                customCities: [
                  ...state.customCities.filter(item => item.id !== city.id),
                  city,
                ],
              }));
            }
            get().addCity(city.id);
          },

          // 基准城市不能移除，列表至少保留一个城市
          removeCity: (cityId: string) => {
            const { selectedCities, customCities, baseZone } = get();
            if (cityId === baseZone.cityId || selectedCities.length <= 1) {
              return;
            }
            set({
              selectedCities: selectedCities.filter(id => id !== cityId),
              // 自定义城市移除后不再保留数据
              customCities: customCities.filter(city => city.id !== cityId),
            });
            get().applyBaseZone();
          },

          setSelectedCities: (cityIds: string[]) => {
            set({ selectedCities: cityIds });
            get().applyBaseZone();
          },

          // 基准设置。手动指定基准城市时关闭"跟随设备"。
          setBaseCity: (cityId: string) => {
            if (!findCity(cityId, get().customCities)) return;
            if (!get().selectedCities.includes(cityId)) {
              get().addCity(cityId);
            }
            set({ baseCityId: cityId, followDeviceZone: false });
            get().applyBaseZone();
          },

          setFollowDeviceZone: (follow: boolean) => {
            set({ followDeviceZone: follow });
            get().applyBaseZone();
          },

          // 设置方法
          setTimeFormat: (is24Hour: boolean) => {
            set({ is24HourFormat: is24Hour });
            get().updateCityTimes();
          },

          setShowSeconds: (show: boolean) => {
            set({ showSeconds: show });
            get().updateCityTimes();
          },

          // 重新推出基准。时刻本身不变，只是换到新时区表示，
          // 所以暂停状态和偏移都保留。
          applyBaseZone: () => {
            const state = get();
            const baseZone = resolveBaseZone(state);
            const { timezone } = baseZone;

            set({
              baseZone,
              baseTime: state.baseTime.setZone(timezone),
              anchorTime: state.anchorTime?.setZone(timezone) ?? null,
            });
            get().updateCityTimes();
          },

          // 更新城市时间
          updateCityTimes: () => {
            const {
              selectedCities,
              customCities,
              baseTime,
              is24HourFormat,
              showSeconds,
            } = get();
            const cityData = resolveCities(selectedCities, customCities);
            const sunPosition =
              SunPositionCalculator.calculateSunPosition(baseTime);

            // 根据设置格式化时间字符串
            const format = is24HourFormat
              ? showSeconds
                ? 'HH:mm:ss'
                : 'HH:mm'
              : showSeconds
                ? 'h:mm:ss a'
                : 'h:mm a';

            const cities = cityData.map(city => {
              const cityTimeData = calculateCityTime(
                city,
                baseTime,
                sunPosition
              );
              return {
                ...cityTimeData,
                timeString: cityTimeData.currentTime.toFormat(format),
              };
            });

            set({ cities });
          },

          // 实时模式管理
          startRealTimeMode: () => {
            if (realTimeInterval) {
              clearInterval(realTimeInterval);
            }

            realTimeInterval = setInterval(() => {
              const state = get();
              if (!state.isRealTime) return;

              // 跟随设备时，设备时区可能在页面打开期间变化
              if (
                state.followDeviceZone &&
                state.baseZone.timezone !== resolveBaseZone(state).timezone
              ) {
                state.applyBaseZone();
              }

              set({ baseTime: nowInBaseZone() });
              get().updateCityTimes();
            }, UI_CONSTANTS.UPDATE_INTERVAL);
          },

          stopRealTimeMode: () => {
            if (realTimeInterval) {
              clearInterval(realTimeInterval);
              realTimeInterval = null;
            }
          },
        };
      },
      {
        name: STORAGE_KEY,
        partialize: (state): PersistedState => ({
          selectedCities: state.selectedCities,
          customCities: state.customCities,
          baseCityId: state.baseCityId,
          followDeviceZone: state.followDeviceZone,
        }),
        // 校验保存的数据：丢弃已不存在的城市；列表为空时退回默认
        merge: (persisted, current) => {
          const stored = (persisted ?? {}) as Partial<PersistedState>;

          const customCities = Array.isArray(stored.customCities)
            ? stored.customCities.filter(
                city =>
                  city &&
                  typeof city.id === 'string' &&
                  typeof city.timezone === 'string' &&
                  TimeCalculator.isValidTimeZone(city.timezone)
              )
            : [];
          const validIds = Array.isArray(stored.selectedCities)
            ? resolveCities(stored.selectedCities, customCities).map(
                city => city.id
              )
            : [];

          const preferences: PersistedState = {
            selectedCities:
              validIds.length > 0 ? validIds : current.selectedCities,
            // 只保留仍在列表里的自定义城市
            customCities: customCities.filter(city =>
              validIds.includes(city.id)
            ),
            baseCityId:
              typeof stored.baseCityId === 'string'
                ? stored.baseCityId
                : current.baseCityId,
            followDeviceZone: stored.followDeviceZone === true,
          };
          const baseZone = resolveBaseZone(preferences);

          return {
            ...current,
            ...preferences,
            baseZone,
            baseTime: current.baseTime.setZone(baseZone.timezone),
          };
        },
      }
    )
  )
);

// 订阅选中城市变化，自动更新城市时间
useTimeStore.subscribe(
  state => state.selectedCities,
  () => {
    useTimeStore.getState().updateCityTimes();
  }
);

// 初始化时启动实时模式
useTimeStore.getState().startRealTimeMode();
useTimeStore.getState().updateCityTimes();

// 热更新时清掉旧模块的定时器，避免叠加
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useTimeStore.getState().stopRealTimeMode();
  });
}
