import { useEffect } from 'react';
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

  useEffect(() => {
    if (!enabled) return;

    // 每次都从 store 读最新偏移：避免闭包里的旧值导致快速滚动丢步，
    // 也不必在每次偏移变化后重新绑定监听。
    // setTimeOffset 自己负责退出实时模式并冻结锚点。
    const shiftTime = (minutes: number) => {
      const { timeOffset, setTimeOffset } = useTimeStore.getState();
      setTimeOffset(timeOffset + minutes);
    };

    const handleWheel = (event: WheelEvent) => {
      // 防止页面滚动
      event.preventDefault();
      shiftTime(event.deltaY > 0 ? sensitivity : -sensitivity);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // 焦点在输入框上时不拦截
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }

      switch (event.code) {
        case 'ArrowLeft':
          event.preventDefault();
          shiftTime(-sensitivity);
          break;
        case 'ArrowRight':
          event.preventDefault();
          shiftTime(sensitivity);
          break;
        case 'Space':
          event.preventDefault();
          useTimeStore.getState().toggleRealTime();
          break;
        case 'Home':
          event.preventDefault();
          useTimeStore.getState().resetToRealTime();
          break;
        default:
          break;
      }
    };

    // 绑定到document以确保全局响应
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, sensitivity]);

  return {
    sensitivity,
  };
};
