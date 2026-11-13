import React, { useMemo } from 'react';
import { Clock3, Hash, Plus, RotateCcw } from 'lucide-react';
import { CityTimeCard } from './CityTimeCard';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { useVisualizationStore } from '@store/visualizationStore';
import { TimeFormatter } from '@utils/timeCalculations';

interface WorldClockProps {
  /** 点"添加"时打开添加城市面板 */
  onAddCity?: () => void;
}

export const WorldClock: React.FC<WorldClockProps> = ({ onAddCity }) => {
  const cities = useTimeStore(state => state.cities);
  const baseTime = useTimeStore(state => state.baseTime);
  const baseZone = useTimeStore(state => state.baseZone);
  const timeOffset = useTimeStore(state => state.timeOffset);
  const isRealTime = useTimeStore(state => state.isRealTime);
  const removeCity = useTimeStore(state => state.removeCity);
  const setBaseCity = useTimeStore(state => state.setBaseCity);
  const resetToRealTime = useTimeStore(state => state.resetToRealTime);

  const cardStyle = useSettingsStore(state => state.cardStyle);
  const setCardStyle = useSettingsStore(state => state.setCardStyle);

  // 选中城市与地图共用同一份状态
  const selectedCity = useVisualizationStore(state => state.selectedCity);
  const setSelectedCity = useVisualizationStore(
    state => state.setSelectedCity
  );

  // 基准城市排第一，其余按当前实际 UTC 偏移（含夏令时）、再按名称排序
  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => {
      if (a.id === baseZone.cityId) return -1;
      if (b.id === baseZone.cityId) return 1;
      return (
        a.currentTime.offset - b.currentTime.offset ||
        a.name.localeCompare(b.name)
      );
    });
  }, [cities, baseZone.cityId]);

  const handleRemoveCity = (cityId: string) => {
    removeCity(cityId);
    if (selectedCity === cityId) {
      setSelectedCity(null);
    }
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCity(selectedCity === cityId ? null : cityId);
  };

  const styleOptions = [
    { value: 'digital', label: '数字', icon: Hash },
    { value: 'analog', label: '钟表', icon: Clock3 },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            世界时钟
          </h2>
          <button
            type="button"
            onClick={onAddCity}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium
                       bg-primary-500 text-white hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加城市
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="truncate">
              {baseZone.label}{' '}
              <span className="font-mono tabular-nums">
                {baseTime.toFormat('HH:mm:ss')}
              </span>{' '}
              {TimeFormatter.formatZoneAbbr(baseTime)}
            </span>
            {timeOffset !== 0 && (
              <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                {TimeFormatter.formatOffsetMinutes(timeOffset)}
              </span>
            )}
            {!isRealTime && (
              <button
                type="button"
                onClick={resetToRealTime}
                className="flex-shrink-0 p-1 rounded text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-gray-800"
                title="回到实时"
                aria-label="回到实时"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 数字 / 钟表切换 */}
          <div
            className="flex-shrink-0 flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800"
            role="radiogroup"
            aria-label="卡片样式"
          >
            {styleOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={cardStyle === value}
                onClick={() => setCardStyle(value)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  cardStyle === value
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 城市列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-6">
        <div
          className={
            cardStyle === 'analog' ? 'grid grid-cols-2 gap-3' : 'space-y-3'
          }
        >
          {sortedCities.map(city => (
            <CityTimeCard
              key={city.id}
              city={city}
              variant={cardStyle}
              baseTimezone={baseZone.timezone}
              isSelected={selectedCity === city.id}
              isBase={city.id === baseZone.cityId}
              canRemove={cities.length > 1}
              onSelect={handleCitySelect}
              onRemove={handleRemoveCity}
              onSetBase={setBaseCity}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
