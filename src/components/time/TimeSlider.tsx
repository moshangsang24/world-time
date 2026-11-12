import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Clock, Calendar } from 'lucide-react';
import { useTimeStore } from '@store/timeStore';
import { BASE_ZONE, TIME_CONSTANTS } from '@data/constants';
import { TimeFormatter } from '@utils/timeCalculations';
import { PerformanceUtils } from '@utils/coordinateUtils';
import { useScrollControl } from '@hooks/useScrollControl';

export const TimeSlider: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  // 鼠标在时间控制区上滚动同样调整时间；键盘由地图那边统一监听
  useScrollControl({ targetRef: rootRef, keyboard: false });

  const { 
    baseTime, 
    isRealTime, 
    timeOffset, 
    setTimeOffset, 
    resetToRealTime, 
    toggleRealTime 
  } = useTimeStore();
  
  const [isDragging, setIsDragging] = useState(false);
  const [localOffset, setLocalOffset] = useState(timeOffset);

  // 防抖更新时间偏移
  const debouncedSetTimeOffset = useCallback(
    PerformanceUtils.debounce((offset: number) => {
      setTimeOffset(offset);
    }, 100),
    [setTimeOffset]
  );

  // 同步本地偏移值
  useEffect(() => {
    if (!isDragging) {
      setLocalOffset(timeOffset);
    }
  }, [timeOffset, isDragging]);

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newOffset = parseInt(event.target.value, 10);
    setLocalOffset(newOffset);
    debouncedSetTimeOffset(newOffset);
  };

  const handleSliderMouseDown = () => {
    setIsDragging(true);
  };

  const handleSliderMouseUp = () => {
    setIsDragging(false);
    // 确保最终值同步
    setTimeOffset(localOffset);
  };

  const formatOffsetDisplay = TimeFormatter.formatOffsetMinutes;

  const getOffsetColor = (offset: number): string => {
    if (offset === 0) return 'text-green-600 dark:text-green-400';
    if (Math.abs(offset) < 360) return 'text-blue-600 dark:text-blue-400'; // 6小时内
    return 'text-amber-600 dark:text-amber-400';
  };

  // 快速跳转按钮
  const quickJumpOffsets = [
    { label: '-24h', offset: -1440 },
    { label: '-12h', offset: -720 },
    { label: '-6h', offset: -360 },
    { label: '-1h', offset: -60 },
    { label: '现在', offset: 0 },
    { label: '+1h', offset: 60 },
    { label: '+6h', offset: 360 },
    { label: '+12h', offset: 720 },
    { label: '+24h', offset: 1440 },
  ];

  return (
    <div
      ref={rootRef}
      className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4"
    >
      <div className="max-w-6xl mx-auto">
        {/* 标题和控制按钮 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              时间控制
            </h3>
            
            {/* 实时模式状态 */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isRealTime ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isRealTime ? '实时模式' : '已暂停'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* 播放/暂停按钮 */}
            <button
              onClick={toggleRealTime}
              className={`p-2 rounded-full transition-colors duration-200 ${
                isRealTime 
                  ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
              }`}
              title={isRealTime ? '暂停实时更新' : '恢复实时更新'}
            >
              {isRealTime ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            {/* 重置按钮 */}
            <button
              onClick={resetToRealTime}
              className="p-2 rounded-full text-gray-600 hover:text-gray-900 
                       hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white 
                       dark:hover:bg-gray-700 transition-colors duration-200"
              title="重置到当前时间"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 当前时间显示 */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4 mr-1" />
                {BASE_ZONE.label}（{TimeFormatter.formatZoneAbbr(baseTime)}）
              </div>
              <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                {baseTime.toFormat('yyyy-MM-dd HH:mm:ss')}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {baseTime.toFormat('cccc', { locale: 'zh' })}
              </div>
            </div>
            
            {/* 偏移量显示 */}
            {timeOffset !== 0 && (
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">时间偏移</div>
                <div className={`text-lg font-semibold ${getOffsetColor(timeOffset)}`}>
                  {formatOffsetDisplay(timeOffset)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 时间滑块 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>-24小时</span>
            <span className={`font-medium ${getOffsetColor(localOffset)}`}>
              {localOffset === 0 ? '当前时间' : formatOffsetDisplay(localOffset)}
            </span>
            <span>+24小时</span>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min={-TIME_CONSTANTS.MINUTES_PER_DAY}
              max={TIME_CONSTANTS.MINUTES_PER_DAY}
              value={localOffset}
              onChange={handleSliderChange}
              onMouseDown={handleSliderMouseDown}
              onMouseUp={handleSliderMouseUp}
              onTouchStart={handleSliderMouseDown}
              onTouchEnd={handleSliderMouseUp}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none 
                       cursor-pointer slider-thumb"
              style={{
                background: `linear-gradient(to right, 
                  #3b82f6 0%, 
                  #10b981 ${((localOffset + TIME_CONSTANTS.MINUTES_PER_DAY) / (TIME_CONSTANTS.MINUTES_PER_DAY * 2)) * 100}%, 
                  #3b82f6 100%)`
              }}
            />
            
            {/* 中心点标记 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                          w-1 h-4 bg-green-500 rounded-full pointer-events-none" />
          </div>
        </div>

        {/* 快速跳转按钮 */}
        <div className="flex flex-wrap gap-2 justify-center">
          {quickJumpOffsets.map((jump) => (
            <button
              key={jump.label}
              onClick={() => {
                setLocalOffset(jump.offset);
                // "现在"回到实时走动，其余按钮相对冻结时刻偏移
                if (jump.offset === 0) {
                  resetToRealTime();
                } else {
                  setTimeOffset(jump.offset);
                }
              }}
              className={`px-3 py-1 text-sm rounded transition-colors duration-200 ${
                localOffset === jump.offset
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {jump.label}
            </button>
          ))}
        </div>

        {/* 使用说明 */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          拖拽滑块或使用快捷按钮来改变时间 • 在地图或这里滚动鼠标滚轮，每格 1 分钟
        </div>
      </div>
    </div>
  );
};