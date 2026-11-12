import { useCallback, useEffect } from 'react';
import { useTimeStore } from '@store/timeStore';
import { UI_CONSTANTS } from '@data/constants';

interface UseScrollControlOptions {
  sensitivity?: number;
  enabled?: boolean;
}

export const useScrollControl = (options: UseScrollControlOptions = {}) => {
  const {
    sensitivity = UI_CONSTANTS.SCROLL_SENSITIVITY,
    enabled = true,
  } = options;

  const { 
    timeOffset, 
    setTimeOffset, 
    isRealTime, 
    toggleRealTime 
  } = useTimeStore();

  // 滚动处理函数
  const handleWheel = useCallback((event: WheelEvent) => {
    if (!enabled) return;

    // 防止页面滚动
    event.preventDefault();

    // 如果当前是实时模式，切换到历史模式
    if (isRealTime) {
      toggleRealTime();
    }

    // 计算时间偏移
    const delta = event.deltaY;
    const offsetChange = delta > 0 ? sensitivity : -sensitivity;
    const newOffset = timeOffset + offsetChange;
    
    // 应用偏移量限制（±24小时）
    const clampedOffset = Math.max(-1440, Math.min(1440, newOffset));
    setTimeOffset(clampedOffset);
  }, [enabled, sensitivity, timeOffset, setTimeOffset, isRealTime, toggleRealTime]);

  // 键盘控制支持
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // 检查焦点是否在输入框上
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA'
    )) {
      return;
    }

    let offsetChange = 0;

    switch (event.code) {
      case 'ArrowLeft':
        offsetChange = -sensitivity;
        break;
      case 'ArrowRight':
        offsetChange = sensitivity;
        break;
      case 'Space':
        event.preventDefault();
        toggleRealTime();
        return;
      case 'Home':
        if (timeOffset !== 0) {
          event.preventDefault();
          setTimeOffset(0);
        }
        return;
      default:
        return;
    }

    if (offsetChange !== 0) {
      event.preventDefault();

      if (isRealTime) {
        toggleRealTime();
      }

      const newOffset = timeOffset + offsetChange;
      const clampedOffset = Math.max(-1440, Math.min(1440, newOffset));
      setTimeOffset(clampedOffset);
    }
  }, [enabled, sensitivity, timeOffset, setTimeOffset, isRealTime, toggleRealTime]);

  // 绑定事件监听器
  useEffect(() => {
    if (enabled) {
      // 绑定到document以确保全局响应
      document.addEventListener('wheel', handleWheel, { passive: false });
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleWheel, handleKeyDown]);

  return {
    sensitivity,
  };
};