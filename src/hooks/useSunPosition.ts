import { useMemo } from 'react';
import { useTimeStore } from '@store/timeStore';
import { SunPositionCalculator } from '@utils/sunCalculations';
import type { SunPosition, DayNightBoundary, SunlightData } from '@/types/geography';

export const useSunPosition = () => {
  const { baseTime } = useTimeStore();

  // 计算太阳位置
  const sunPosition = useMemo<SunPosition>(() => {
    return SunPositionCalculator.calculateSunPosition(baseTime);
  }, [baseTime]);

  // 计算昼夜分界线
  const dayNightBoundary = useMemo<DayNightBoundary>(() => {
    return SunPositionCalculator.calculateDayNightBoundary(sunPosition);
  }, [sunPosition]);

  // 计算完整的太阳光照数据
  const sunlightData = useMemo<SunlightData>(() => {
    return SunPositionCalculator.calculateSunlightData(baseTime);
  }, [baseTime]);

  // 判断指定坐标是否为白昼的函数
  const isDaylight = useMemo(() => {
    return (latitude: number, longitude: number) => {
      return SunPositionCalculator.isDaylight(latitude, longitude, sunPosition);
    };
  }, [sunPosition]);

  // 计算太阳高度角的函数
  const getSunAltitude = useMemo(() => {
    return (latitude: number, longitude: number) => {
      return SunPositionCalculator.calculateSunAltitude(latitude, longitude, baseTime);
    };
  }, [baseTime]);

  return {
    sunPosition,
    dayNightBoundary,
    sunlightData,
    isDaylight,
    getSunAltitude,
  };
};

// 用于特定位置的太阳位置Hook
export const useSunPositionForLocation = (latitude: number, longitude: number) => {
  const { baseTime } = useTimeStore();

  const locationSunData = useMemo(() => {
    const sunlightData = SunPositionCalculator.calculateSunlightData(baseTime, latitude, longitude);
    const altitude = SunPositionCalculator.calculateSunAltitude(latitude, longitude, baseTime);
    const isDaytime = SunPositionCalculator.isDaylight(latitude, longitude, sunlightData.sunPosition);

    return {
      ...sunlightData,
      altitude,
      isDaytime,
    };
  }, [baseTime, latitude, longitude]);

  return locationSunData;
};