import React, { Suspense, useRef } from 'react';
import { WorldMap2D } from './WorldMap2D';
import { useVisualizationStore } from '@store/visualizationStore';
import { useTimeState } from '@hooks/useTimeState';
import { useScrollControl } from '@hooks/useScrollControl';
import { LoadingSpinner } from '@components/common/LoadingSpinner';

interface EarthVisualizationProps {
  className?: string;
  onCityClick?: (cityId: string) => void;
}

// 加载组件
const LoadingFallback: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-900">
    <div className="text-center">
      <LoadingSpinner size="lg" color="white" />
      <p className="mt-4 text-white text-sm">加载世界地图中...</p>
    </div>
  </div>
);

export const EarthVisualization: React.FC<EarthVisualizationProps> = ({
  className = '',
  onCityClick,
}) => {
  const { cities } = useTimeState();
  const {
    selectedCity,
    setSelectedCity,
  } = useVisualizationStore();

  // 鼠标在地图上滚动时调整时间；侧栏等其他区域保持原生滚动
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollControl({ targetRef: containerRef });

  // cityId 为 null 表示取消选中
  const handleCityClick = (cityId: string | null) => {
    setSelectedCity(cityId);
    if (cityId) {
      onCityClick?.(cityId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-slate-200 dark:bg-slate-950 ${className}`}
    >
      <Suspense fallback={<LoadingFallback />}>
        <WorldMap2D
          cities={cities}
          onCityClick={handleCityClick}
          selectedCity={selectedCity}
        />
      </Suspense>

      {/* 选中城市信息面板 */}
      {selectedCity && (
        <div className="absolute top-3 left-3 bg-slate-900/75 text-white 
                       rounded-lg p-3 pointer-events-none z-10 max-w-xs">
          {(() => {
            const city = cities.find(c => c.id === selectedCity);
            if (!city) return null;
            
            return (
              <div>
                <h3 className="font-bold text-sm">{city.name}</h3>
                <p className="text-xs text-gray-300">{city.country}</p>
                <p className="text-sm mt-1 font-mono">{city.timeString}</p>
                <p className="text-xs text-gray-400">{city.localDate}</p>
                <p className="text-xs text-gray-400">
                  {city.isDaytime ? '☀️ 白天' : '🌙 夜晚'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {city.latitude.toFixed(2)}°, {city.longitude.toFixed(2)}°
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};