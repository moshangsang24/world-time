import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DateTime } from 'luxon';
import type { TimeState, CityTimeData } from '@/types/time';
import { DEFAULT_SELECTED_CITIES, getCitiesByIds } from '@data/cities';
import { BASE_ZONE, TIME_CONSTANTS, UI_CONSTANTS } from '@data/constants';

interface TimeActions {
  // 时间控制
  setTimeOffset: (offset: number) => void;
  resetToRealTime: () => void;
  toggleRealTime: () => void;
  
  // 城市管理
  addCity: (cityId: string) => void;
  removeCity: (cityId: string) => void;
  setSelectedCities: (cityIds: string[]) => void;
  
  // 设置
  setTimeFormat: (is24Hour: boolean) => void;
  setShowSeconds: (show: boolean) => void;
  
  // 内部方法
  updateCityTimes: () => void;
  startRealTimeMode: () => void;
  stopRealTimeMode: () => void;
}

type TimeStore = TimeState & TimeActions;

// 计算城市时间数据
const calculateCityTime = (
  cityData: ReturnType<typeof getCitiesByIds>[0],
  baseTime: DateTime
): CityTimeData => {
  const cityTime = baseTime.setZone(cityData.timezone);
  
  return {
    ...cityData,
    currentTime: cityTime,
    localDate: cityTime.toFormat('yyyy-MM-dd'),
    timeString: cityTime.toFormat('HH:mm:ss'),
    utcOffsetString: cityTime.toFormat('ZZ'),
    isDaytime: true, // 暂时设为true，后续会根据太阳位置计算
  };
};

// 当前时刻（基准时区）
const nowInBaseZone = (): DateTime =>
  DateTime.now().setZone(BASE_ZONE.timezone);

// 实时更新定时器
let realTimeInterval: ReturnType<typeof setInterval> | null = null;

export const useTimeStore = create<TimeStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    baseTime: nowInBaseZone(),
    isRealTime: true,
    timeOffset: 0,
    anchorTime: null,
    cities: [],
    selectedCities: DEFAULT_SELECTED_CITIES,
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
      set(state => {
        if (!state.selectedCities.includes(cityId)) {
          return {
            selectedCities: [...state.selectedCities, cityId],
          };
        }
        return state;
      });
      
      get().updateCityTimes();
    },

    removeCity: (cityId: string) => {
      set(state => ({
        selectedCities: state.selectedCities.filter(id => id !== cityId),
      }));
      
      get().updateCityTimes();
    },

    setSelectedCities: (cityIds: string[]) => {
      set({ selectedCities: cityIds });
      get().updateCityTimes();
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

    // 更新城市时间
    updateCityTimes: () => {
      const { selectedCities, baseTime, is24HourFormat, showSeconds } = get();
      const cityData = getCitiesByIds(selectedCities);
      
      const cities = cityData.map(city => {
        const cityTimeData = calculateCityTime(city, baseTime);
        
        // 根据设置格式化时间字符串
        const format = is24HourFormat 
          ? (showSeconds ? 'HH:mm:ss' : 'HH:mm')
          : (showSeconds ? 'h:mm:ss a' : 'h:mm a');
          
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
        if (get().isRealTime) {
          set({ baseTime: nowInBaseZone() });
          get().updateCityTimes();
        }
      }, UI_CONSTANTS.UPDATE_INTERVAL);
    },

    stopRealTimeMode: () => {
      if (realTimeInterval) {
        clearInterval(realTimeInterval);
        realTimeInterval = null;
      }
    },
  }))
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
