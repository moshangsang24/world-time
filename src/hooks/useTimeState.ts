import { useMemo } from 'react';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { TimeFormatter } from '@utils/timeCalculations';
import type { CityTimeData } from '@/types/time';

export const useTimeState = () => {
  const timeState = useTimeStore();
  const { language, timeFormat, showSeconds } = useSettingsStore();

  // 按用户设置重新格式化的城市时间数据（昼夜已由 timeStore 算好）
  const enhancedCities = useMemo<CityTimeData[]>(() => {
    return timeState.cities.map(city => ({
      ...city,
      timeString: TimeFormatter.formatTime(
        city.currentTime, 
        timeFormat, 
        showSeconds
      ),
      localDate: TimeFormatter.formatDate(city.currentTime, language),
    }));
  }, [timeState.cities, timeFormat, showSeconds, language]);

  // 基准时间的格式化显示
  const formattedBaseTime = useMemo(() => {
    return {
      time: TimeFormatter.formatTime(timeState.baseTime, timeFormat, showSeconds),
      date: TimeFormatter.formatDate(timeState.baseTime, language),
      utcOffset: TimeFormatter.formatUtcOffset(timeState.baseTime),
      label: timeState.baseZone.label,
      zoneAbbr: TimeFormatter.formatZoneAbbr(timeState.baseTime),
    };
  }, [
    timeState.baseTime,
    timeState.baseZone.label,
    timeFormat,
    showSeconds,
    language,
  ]);

  // 时间偏移的格式化显示
  const formattedTimeOffset = useMemo(() => {
    if (timeState.timeOffset === 0) return null;
    
    return TimeFormatter.formatOffsetMinutes(timeState.timeOffset);
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
        // 当前实际偏移（小时），含夏令时
        utcOffset: cities[0].currentTime.offset / 60,
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