import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DateTime } from 'luxon';
import type { TimeState, CityTimeData } from '@/types/time';
import { DEFAULT_SELECTED_CITIES, getCitiesByIds } from '@data/cities';

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

// 实时更新定时器
let realTimeInterval: ReturnType<typeof setTimeout> | null = null;

export const useTimeStore = create<TimeStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    beijingTime: DateTime.now().setZone('Asia/Shanghai'),
    utcTime: DateTime.utc(),
    isRealTime: true,
    timeOffset: 0,
    cities: [],
    selectedCities: DEFAULT_SELECTED_CITIES,
    is24HourFormat: true,
    showSeconds: true,

    // 时间控制方法
    setTimeOffset: (offset: number) => {
      const clampedOffset = Math.max(-1440, Math.min(1440, offset));
      set(() => {
        const baseTime = DateTime.now().plus({ minutes: clampedOffset });
        const beijingTime = baseTime.setZone('Asia/Shanghai');
        const utcTime = baseTime.toUTC();
        
        return {
          timeOffset: clampedOffset,
          beijingTime,
          utcTime,
          isRealTime: false,
        };
      });
      
      // 更新城市时间
      get().updateCityTimes();
    },

    resetToRealTime: () => {
      set({
        timeOffset: 0,
        isRealTime: true,
        beijingTime: DateTime.now().setZone('Asia/Shanghai'),
        utcTime: DateTime.utc(),
      });
      
      get().updateCityTimes();
      get().startRealTimeMode();
    },

    toggleRealTime: () => {
      const { isRealTime } = get();
      if (isRealTime) {
        get().stopRealTimeMode();
      } else {
        get().startRealTimeMode();
      }
      
      set({ isRealTime: !isRealTime });
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
      const { selectedCities, beijingTime, is24HourFormat, showSeconds } = get();
      const cityData = getCitiesByIds(selectedCities);
      
      const cities = cityData.map(city => {
        const cityTimeData = calculateCityTime(city, beijingTime);
        
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
        const { isRealTime } = get();
        if (isRealTime) {
          set({
            beijingTime: DateTime.now().setZone('Asia/Shanghai'),
            utcTime: DateTime.utc(),
          });
          get().updateCityTimes();
        }
      }, 1000);
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