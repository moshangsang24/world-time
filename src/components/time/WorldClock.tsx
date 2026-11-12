import React, { useState, useMemo } from 'react';
import { Plus, Settings, Grid, List } from 'lucide-react';
import { CityTimeCard } from './CityTimeCard';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { MAJOR_CITIES } from '@data/cities';
import { BASE_ZONE } from '@data/constants';
import { TimeFormatter } from '@utils/timeCalculations';

type ViewMode = 'grid' | 'list';

export const WorldClock: React.FC = () => {
  const { 
    cities, 
    selectedCities, 
    baseTime,
    isRealTime,
    timeOffset,
    addCity, 
    removeCity,
    resetToRealTime,
  } = useTimeStore();
  
  const { language } = useSettingsStore();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // 可添加的城市列表（排除已选择的）
  const availableCities = useMemo(() => {
    return MAJOR_CITIES.filter(city => !selectedCities.includes(city.id));
  }, [selectedCities]);

  // 按时区排序的城市
  const sortedCities = useMemo(() => {
    return [...cities].sort((a, b) => {
      // 基准城市始终排第一
      if (a.id === BASE_ZONE.cityId) return -1;
      if (b.id === BASE_ZONE.cityId) return 1;
      // 首先按UTC偏移排序
      if (a.utcOffset !== b.utcOffset) {
        return a.utcOffset - b.utcOffset;
      }
      // 相同时区按名称排序
      return a.name.localeCompare(b.name);
    });
  }, [cities]);

  const handleAddCity = (cityId: string) => {
    addCity(cityId);
    setShowAddDialog(false);
  };

  const handleRemoveCity = (cityId: string) => {
    removeCity(cityId);
    if (selectedCity === cityId) {
      setSelectedCity(null);
    }
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCity(prev => prev === cityId ? null : cityId);
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部控制栏 */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              世界时钟
            </h2>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
              <span>
                {BASE_ZONE.label}: {baseTime.toFormat('HH:mm:ss')}{' '}
                {TimeFormatter.formatZoneAbbr(baseTime)}
              </span>
              {timeOffset !== 0 && (
                <span className="ml-2 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 
                               text-yellow-800 dark:text-yellow-400 rounded text-xs">
                  时间偏移: {timeOffset > 0 ? '+' : ''}{Math.round(timeOffset / 60)}小时
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isRealTime && (
              <button
                onClick={resetToRealTime}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 
                         transition-colors duration-200"
              >
                回到实时
              </button>
            )}
            
            {/* 视图模式切换 */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="网格视图"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="列表视图"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* 添加城市按钮 */}
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center px-3 py-2 bg-primary-500 text-white rounded 
                       hover:bg-primary-600 transition-colors duration-200"
              disabled={availableCities.length === 0}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加城市
            </button>

            {/* 设置按钮 */}
            <button
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 
                       dark:hover:text-white transition-colors duration-200"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 城市列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {cities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-xl font-medium mb-2">还没有添加任何城市</h3>
            <p className="text-center mb-4">点击"添加城市"按钮来添加您想关注的时区</p>
            <button
              onClick={() => setShowAddDialog(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded 
                       hover:bg-primary-600 transition-colors duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加第一个城市
            </button>
          </div>
        ) : (
          <div className={`
            ${viewMode === 'grid' 
              ? 'grid grid-cols-1 lg:grid-cols-2 gap-3' 
              : 'space-y-3'
            }
          `}>
            {sortedCities.map((city) => (
              <CityTimeCard
                key={city.id}
                city={city}
                isSelected={selectedCity === city.id}
                isBase={city.id === BASE_ZONE.cityId}
                onSelect={handleCitySelect}
                onRemove={handleRemoveCity}
                showRemoveButton={cities.length > 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 添加城市对话框 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                添加城市
              </h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                         dark:hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-2">
              {availableCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleAddCity(city.id)}
                  className="w-full text-left p-3 rounded border border-gray-200 
                           dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 
                           transition-colors duration-200"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {language === 'zh' ? city.name : city.nameEn}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {city.country} • UTC{city.utcOffset >= 0 ? '+' : ''}{city.utcOffset}
                  </div>
                </button>
              ))}
              
              {availableCities.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                  所有可用城市都已添加
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};