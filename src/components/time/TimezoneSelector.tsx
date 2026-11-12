import React, { useState, useMemo } from 'react';
import { Search, MapPin, Clock, Plus, Check } from 'lucide-react';
import { MAJOR_CITIES } from '@data/cities';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { I18nFormatters } from '@utils/formatters';
import type { CityData } from '@/types/time';
import { DateTime } from 'luxon';

interface TimezoneGroupProps {
  timezone: string;
  utcOffset: number; // 当前实际偏移（小时）
  cities: CityData[];
  selectedCities: string[];
  onCitySelect: (cityId: string) => void;
  language: string;
}

const TimezoneGroup: React.FC<TimezoneGroupProps> = ({
  utcOffset,
  cities,
  selectedCities,
  onCitySelect,
  language,
}) => {
  const formatOffset = (offset: number) => {
    const hours = Math.floor(Math.abs(offset));
    const minutes = (Math.abs(offset) % 1) * 60;
    const sign = offset >= 0 ? '+' : '-';
    return minutes > 0 ? `UTC${sign}${hours}:${minutes.toString().padStart(2, '0')}` : `UTC${sign}${hours}`;
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
        <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          {formatOffset(utcOffset)}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            ({cities.length} 个城市)
          </span>
        </h3>
      </div>
      
      <div className="p-2 space-y-1">
        {cities.map((city) => {
          const isSelected = selectedCities.includes(city.id);
          const cityName = I18nFormatters.getCityName(city, language);
          
          return (
            <button
              key={city.id}
              onClick={() => onCitySelect(city.id)}
              disabled={isSelected}
              className={`w-full flex items-center justify-between p-3 rounded-md 
                       transition-colors duration-200 text-left ${
                isSelected
                  ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-600 border border-transparent'
              }`}
            >
              <div className="flex items-center flex-1">
                <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                <div>
                  <div className={`font-medium ${
                    isSelected ? 'text-green-800 dark:text-green-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {cityName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {city.country}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0 ml-3">
                {isSelected ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const TimezoneSelector: React.FC = () => {
  const { selectedCities, addCity } = useTimeStore();
  // 只取到小时：偏移只会在整点（夏令时切换）变化，避免每秒重新分组
  const currentHour = useTimeStore(state =>
    state.baseTime.startOf('hour').toMillis()
  );
  const { language } = useSettingsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'offset' | 'name' | 'country'>('offset');

  // 过滤和分组城市
  const { filteredCities, timezoneGroups } = useMemo(() => {
    // 搜索过滤
    const filtered = MAJOR_CITIES.filter(city => {
      const query = searchQuery.toLowerCase();
      return (
        city.name.toLowerCase().includes(query) ||
        city.nameEn.toLowerCase().includes(query) ||
        city.country.toLowerCase().includes(query) ||
        city.timezone.toLowerCase().includes(query)
      );
    });

    // 按时区分组
    const groups = filtered.reduce((acc, city) => {
      const { timezone } = city;
      if (!acc[timezone]) {
        acc[timezone] = [];
      }
      acc[timezone].push(city);
      return acc;
    }, {} as Record<string, CityData[]>);

    // 排序分组
    const sortedGroups = Object.entries(groups)
      .map(([timezone, cities]) => ({
        timezone,
        cities: cities.sort((a, b) => {
          if (sortBy === 'name') {
            return language === 'zh' 
              ? a.name.localeCompare(b.name)
              : a.nameEn.localeCompare(b.nameEn);
          } else if (sortBy === 'country') {
            return a.country.localeCompare(b.country);
          }
          return a.name.localeCompare(b.name);
        }),
        // 当前实际偏移（小时），含夏令时
        utcOffset:
          DateTime.fromMillis(currentHour).setZone(timezone).offset / 60,
      }))
      .sort((a, b) => {
        if (sortBy === 'offset') {
          return a.utcOffset - b.utcOffset;
        } else if (sortBy === 'name') {
          return a.timezone.localeCompare(b.timezone);
        }
        return a.timezone.localeCompare(b.timezone);
      });

    return {
      filteredCities: filtered,
      timezoneGroups: sortedGroups,
    };
  }, [searchQuery, sortBy, language, currentHour]);

  const handleCitySelect = (cityId: string) => {
    if (!selectedCities.includes(cityId)) {
      addCity(cityId);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 搜索和排序 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          添加时区
        </h2>
        
        {/* 搜索框 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 
                           w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索城市、国家或时区..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 
                     rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* 排序选项 */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            排序方式:
          </span>
          <div className="flex space-x-2">
            {[
              { value: 'offset', label: '时区' },
              { value: 'name', label: '城市' },
              { value: 'country', label: '国家' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSortBy(value as typeof sortBy)}
                className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${
                  sortBy === value
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 结果统计 */}
      <div className="flex-shrink-0 px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            找到 {filteredCities.length} 个城市，分布在 {timezoneGroups.length} 个时区
          </span>
          <span>
            已选择 {selectedCities.length} 个城市
          </span>
        </div>
      </div>

      {/* 时区列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {timezoneGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Search className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">没有找到匹配的城市</h3>
            <p className="text-center">尝试搜索其他关键词</p>
          </div>
        ) : (
          <div className="space-y-4">
            {timezoneGroups.map(({ timezone, cities, utcOffset }) => (
              <TimezoneGroup
                key={timezone}
                timezone={timezone}
                utcOffset={utcOffset}
                cities={cities}
                selectedCities={selectedCities}
                onCitySelect={handleCitySelect}
                language={language}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};