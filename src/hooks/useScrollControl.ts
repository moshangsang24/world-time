import { useEffect, type RefObject } from 'react';
import { useTimeStore } from '@store/timeStore';
import { UI_CONSTANTS } from '@data/constants';

interface UseScrollControlOptions {
  /** 只有鼠标在这个元素上时，滚轮才用来调时间；其余区域保持原生滚动 */
  targetRef: RefObject<HTMLElement>;
  sensitivity?: number;
  enabled?: boolean;
  /** 是否同时注册全局键盘快捷键。多处使用本 hook 时只让一处为 true */
  keyboard?: boolean;
}

// 每次都从 store 读最新偏移：避免闭包里的旧值导致快速滚动丢步，
// 也不必在每次偏移变化后重新绑定监听。
// setTimeOffset 自己负责退出实时模式并冻结锚点。
const shiftTime = (minutes: number) => {
  const { timeOffset, setTimeOffset } = useTimeStore.getState();
  setTimeOffset(timeOffset + minutes);
};

export const useScrollControl = ({
  targetRef,
  sensitivity = UI_CONSTANTS.SCROLL_SENSITIVITY,
  enabled = true,
  keyboard = true,
}: UseScrollControlOptions) => {
  // 滚轮：只绑在目标元素上
  useEffect(() => {
    const target = targetRef.current;
    if (!enabled || !target) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      // 阻止页面跟着滚动；需要 passive: false
      event.preventDefault();
      shiftTime(event.deltaY > 0 ? sensitivity : -sensitivity);
    };

    target.addEventListener('wheel', handleWheel, { passive: false });
    return () => target.removeEventListener('wheel', handleWheel);
  }, [targetRef, enabled, sensitivity]);

  // 键盘：全局
  useEffect(() => {
    if (!enabled || !keyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 焦点在输入框上时不拦截（滑块除外，它没有文字输入）
      const active = document.activeElement;
      if (
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLInputElement && active.type !== 'range')
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
          // 焦点在按钮上时让空格照常触发按钮
          if (active instanceof HTMLButtonElement) return;
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

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, keyboard, sensitivity]);

  return {
    sensitivity,
  };
};
