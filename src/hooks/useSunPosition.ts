import { useMemo } from 'react';
import { useTimeStore } from '@store/timeStore';
import { SunPositionCalculator } from '@utils/sunCalculations';
import type { SunPosition, DayNightBoundary, SunlightData } from '@/types/geography';

export const useSunPosition = () => {
  const { beijingTime } = useTimeStore();

  // 计算太阳位置
  const sunPosition = useMemo<SunPosition>(() => {
    return SunPositionCalculator.calculateSunPosition(beijingTime);
  }, [beijingTime]);

  // 计算昼夜分界线
  const dayNightBoundary = useMemo<DayNightBoundary>(() => {
    return SunPositionCalculator.calculateDayNightBoundary(sunPosition);
  }, [sunPosition]);

  // 计算完整的太阳光照数据
  const sunlightData = useMemo<SunlightData>(() => {
    return SunPositionCalculator.calculateSunlightData(beijingTime);
  }, [beijingTime]);

  // 判断指定坐标是否为白昼的函数
  const isDaylight = useMemo(() => {
    return (latitude: number, longitude: number) => {
      return SunPositionCalculator.isDaylight(latitude, longitude, sunPosition);
    };
  }, [sunPosition]);

  // 计算太阳高度角的函数
  const getSunAltitude = useMemo(() => {
    return (latitude: number, longitude: number) => {
      return SunPositionCalculator.calculateSunAltitude(latitude, longitude, beijingTime);
    };
  }, [beijingTime]);

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
  const { beijingTime } = useTimeStore();

  const locationSunData = useMemo(() => {
    const sunlightData = SunPositionCalculator.calculateSunlightData(beijingTime, latitude, longitude);
    const altitude = SunPositionCalculator.calculateSunAltitude(latitude, longitude, beijingTime);
    const isDaytime = SunPositionCalculator.isDaylight(latitude, longitude, sunlightData.sunPosition);

    return {
      ...sunlightData,
      altitude,
      isDaytime,
    };
  }, [beijingTime, latitude, longitude]);

  return locationSunData;
};