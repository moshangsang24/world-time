import { useMemo } from 'react';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { TimeFormatter } from '@utils/timeCalculations';
import { BASE_ZONE } from '@data/constants';
import { useSunPosition } from './useSunPosition';
import type { CityTimeData } from '@/types/time';

export const useTimeState = () => {
  const timeState = useTimeStore();
  const { language, timeFormat, showSeconds } = useSettingsStore();
  const { isDaylight } = useSunPosition();

  // 增强的城市时间数据（包含太阳位置计算）
  const enhancedCities = useMemo<CityTimeData[]>(() => {
    return timeState.cities.map(city => ({
      ...city,
      isDaytime: isDaylight(city.latitude, city.longitude),
      timeString: TimeFormatter.formatTime(
        city.currentTime, 
        timeFormat, 
        showSeconds
      ),
      localDate: TimeFormatter.formatDate(city.currentTime, language),
    }));
  }, [timeState.cities, isDaylight, timeFormat, showSeconds, language]);

  // 基准时间的格式化显示
  const formattedBaseTime = useMemo(() => {
    return {
      time: TimeFormatter.formatTime(timeState.baseTime, timeFormat, showSeconds),
      date: TimeFormatter.formatDate(timeState.baseTime, language),
      utcOffset: TimeFormatter.formatUtcOffset(timeState.baseTime),
      label: BASE_ZONE.label,
      zoneAbbr: TimeFormatter.formatZoneAbbr(timeState.baseTime),
    };
  }, [timeState.baseTime, timeFormat, showSeconds, language]);

  // 时间偏移的格式化显示
  const formattedTimeOffset = useMemo(() => {
    if (timeState.timeOffset === 0) return null;
    
    const hours = Math.floor(Math.abs(timeState.timeOffset) / 60);
    const minutes = Math.abs(timeState.timeOffset) % 60;
    const sign = timeState.timeOffset >= 0 ? '+' : '-';
    
    if (minutes === 0) {
      return `${sign}${hours}小时`;
    }
    return `${sign}${hours}小时${minutes}分钟`;
  }, [timeState.timeOffset]);

  // 按时区分组的城市
  const citiesByTimezone = useMemo(() => {
    const groups = enhancedCities.reduce((acc, city) => {
      const { timezone } = city;
      if (!acc[timezone]) {
        acc[timezone] = [];
      }
      acc[timezone].push(city);
      return acc;
    }, {} as Record<string, CityTimeData[]>);

    return Object.entries(groups)
      .map(([timezone, cities]) => ({
        timezone,
        cities,
        utcOffset: cities[0].utcOffset,
      }))
      .sort((a, b) => a.utcOffset - b.utcOffset);
  }, [enhancedCities]);

  // 白天和夜晚的城市分组
  const citiesByDayNight = useMemo(() => {
    const daytimeCities = enhancedCities.filter(city => city.isDaytime);
    const nighttimeCities = enhancedCities.filter(city => !city.isDaytime);
    
    return {
      daytime: daytimeCities,
      nighttime: nighttimeCities,
    };
  }, [enhancedCities]);

  // 时区统计信息
  const timezoneStats = useMemo(() => {
    return {
      totalCities: enhancedCities.length,
      totalTimezones: citiesByTimezone.length,
      daytimeCities: citiesByDayNight.daytime.length,
      nighttimeCities: citiesByDayNight.nighttime.length,
    };
  }, [enhancedCities.length, citiesByTimezone.length, citiesByDayNight]);

  return {
    // 原始时间状态
    ...timeState,
    
    // 增强的数据
    cities: enhancedCities,
    formattedBaseTime,
    formattedTimeOffset,
    citiesByTimezone,
    citiesByDayNight,
    timezoneStats,
  };
};