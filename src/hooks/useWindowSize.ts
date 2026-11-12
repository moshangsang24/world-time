import { useState, useEffect } from 'react';
import { PerformanceUtils } from '@utils/coordinateUtils';

interface WindowSize {
  width: number;
  height: number;
}

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = PerformanceUtils.throttle(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowSize;
};

interface BreakpointOptions {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}

const defaultBreakpoints: Required<BreakpointOptions> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const useBreakpoint = (breakpoints: BreakpointOptions = {}) => {
  const { width } = useWindowSize();
  const bp = { ...defaultBreakpoints, ...breakpoints };

  const isSm = width >= bp.sm;
  const isMd = width >= bp.md;
  const isLg = width >= bp.lg;
  const isXl = width >= bp.xl;
  const is2Xl = width >= bp['2xl'];

  const current = is2Xl ? '2xl' : isXl ? 'xl' : isLg ? 'lg' : isMd ? 'md' : isSm ? 'sm' : 'xs';

  return {
    width,
    current,
    isSm,
    isMd,
    isLg,
    isXl,
    is2Xl,
    isSmDown: width < bp.sm,
    isMdDown: width < bp.md,
    isLgDown: width < bp.lg,
    isXlDown: width < bp.xl,
  };
};