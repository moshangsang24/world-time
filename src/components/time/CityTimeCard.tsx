import React from 'react';
import { Clock, MapPin, Sun, Moon } from 'lucide-react';
import type { CityTimeData } from '@/types/time';
import { I18nFormatters } from '@utils/formatters';
import { useSettingsStore } from '@store/settingsStore';

interface CityTimeCardProps {
  city: CityTimeData;
  isSelected?: boolean;
  onSelect?: (cityId: string) => void;
  onRemove?: (cityId: string) => void;
  showRemoveButton?: boolean;
}

export const CityTimeCard: React.FC<CityTimeCardProps> = ({
  city,
  isSelected = false,
  onSelect,
  onRemove,
  showRemoveButton = false,
}) => {
  const { language } = useSettingsStore();
  
  const cityName = I18nFormatters.getCityName(city, language);
  const weekday = I18nFormatters.formatWeekday(city.currentTime, language);
  
  const handleCardClick = () => {
    onSelect?.(city.id);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(city.id);
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg border transition-all duration-200 cursor-pointer
        hover:shadow-md hover:-translate-y-1
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm'
        }
        ${city.isDaytime 
          ? 'border-l-4 border-l-yellow-400' 
          : 'border-l-4 border-l-blue-400'
        }
      `}
      onClick={handleCardClick}
    >
      {/* 移除按钮 */}
      {showRemoveButton && (
        <button
          onClick={handleRemoveClick}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white 
                     hover:bg-red-600 transition-colors duration-200 flex items-center justify-center
                     opacity-70 hover:opacity-100"
          aria-label={`移除${cityName}`}
        >
          ×
        </button>
      )}

      {/* 城市名称和国家 */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
            {cityName}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
            <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
            <span className="truncate">{city.country}</span>
          </p>
        </div>
        
        {/* 昼夜图标 */}
        <div className="flex-shrink-0 ml-2">
          {city.isDaytime ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-blue-400" />
          )}
        </div>
      </div>

      {/* 时间显示 */}
      <div className="mb-2">
        <div className="flex items-center mb-1">
          <Clock className="w-3 h-3 mr-1 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
            {city.timeString}
          </span>
        </div>
        
        {/* 日期和星期 */}
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="truncate">{city.localDate}</div>
          <div className="truncate">{weekday}</div>
        </div>
      </div>

      {/* UTC偏移和时差 */}
      <div className="flex justify-between items-center text-xs">
        <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
          {city.utcOffsetString}
        </span>
        
        {/* 昼夜状态 */}
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          city.isDaytime 
            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' 
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
        }`}>
          {city.isDaytime ? '☀️' : '🌙'}
        </span>
      </div>
    </div>
  );
};