import { useCallback, useMemo } from 'react';
import { useTimeStore } from '@store/timeStore';
import { SunPositionCalculator } from '@utils/sunCalculations';
import type { SunPosition, DayNightBoundary } from '@/types/geography';

export const useSunPosition = () => {
  const baseTime = useTimeStore(state => state.baseTime);

  // 太阳直射点
  const sunPosition = useMemo<SunPosition>(() => {
    return SunPositionCalculator.calculateSunPosition(baseTime);
  }, [baseTime]);

  // 晨昏线
  const dayNightBoundary = useMemo<DayNightBoundary>(() => {
    return SunPositionCalculator.calculateDayNightBoundary(sunPosition);
  }, [sunPosition]);

  // 判断指定坐标是否为白昼
  const isDaylight = useCallback(
    (latitude: number, longitude: number) => {
      return SunPositionCalculator.isDaylight(latitude, longitude, sunPosition);
    },
    [sunPosition]
  );

  // 指定坐标的太阳高度角（度）
  const getSunAltitude = useCallback(
    (latitude: number, longitude: number) => {
      return SunPositionCalculator.altitudeAt(latitude, longitude, sunPosition);
    },
    [sunPosition]
  );

  return {
    sunPosition,
    dayNightBoundary,
    isDaylight,
    getSunAltitude,
  };
};

// 用于特定位置的太阳数据（含日出日落）
export const useSunPositionForLocation = (
  latitude: number,
  longitude: number
) => {
  const baseTime = useTimeStore(state => state.baseTime);

  return useMemo(() => {
    const sunlightData = SunPositionCalculator.calculateSunlightData(
      baseTime,
      latitude,
      longitude
    );

    return {
      ...sunlightData,
      altitude: SunPositionCalculator.altitudeAt(
        latitude,
        longitude,
        sunlightData.sunPosition
      ),
      isDaytime: SunPositionCalculator.isDaylight(
        latitude,
        longitude,
        sunlightData.sunPosition
      ),
    };
  }, [baseTime, latitude, longitude]);
};
