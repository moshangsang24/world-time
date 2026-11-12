import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSunPosition } from '@hooks/useSunPosition';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { BASE_ZONE } from '@data/constants';
import type { CityTimeData } from '@/types/time';
import { drawBaseMap } from './map2d/drawBaseMap';
import { drawNightShade } from './map2d/drawNightShade';
import { drawOverlay } from './map2d/drawOverlay';
import { MAP_PALETTES, MARKER_COLORS } from './map2d/palette';
import { fitViewport, project } from './map2d/projection';

interface WorldMap2DProps {
  cities: CityTimeData[];
  onCityClick?: (cityId: string | null) => void;
  selectedCity?: string | null;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

/** 点击 / 悬停命中城市的半径（CSS 像素） */
const HIT_RADIUS = 14;

const formatCoordinate = (
  value: number,
  positive: string,
  negative: string
): string => `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;

export const WorldMap2D: React.FC<WorldMap2DProps> = ({
  cities,
  onCityClick,
  selectedCity = null,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<CanvasSize | null>(null);
  const [hoveringCity, setHoveringCity] = useState(false);

  const baseTime = useTimeStore(state => state.baseTime);
  const theme = useSettingsStore(state => state.theme);
  const { sunPosition, dayNightBoundary } = useSunPosition();

  const palette = useMemo(() => {
    const isDark =
      theme === 'dark' ||
      (theme === 'auto' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    return MAP_PALETTES[isDark ? 'dark' : 'light'];
  }, [theme]);

  // 跟随容器尺寸：窗口缩放、侧栏展开收起都会触发
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const next = {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        dpr: window.devicePixelRatio || 1,
      };
      setSize(previous =>
        previous &&
        previous.width === next.width &&
        previous.height === next.height &&
        previous.dpr === next.dpr
          ? previous
          : next
      );
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(
    () => (size ? fitViewport(size.width, size.height) : null),
    [size]
  );

  // 底图不随时间变化，画到离屏 canvas 上缓存，只在尺寸或主题变化时重画
  const baseLayer = useMemo(() => {
    if (!size || !viewport || size.width === 0 || size.height === 0) {
      return null;
    }

    const layer = document.createElement('canvas');
    layer.width = Math.round(size.width * size.dpr);
    layer.height = Math.round(size.height * size.dpr);

    const ctx = layer.getContext('2d');
    if (!ctx) return null;

    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    ctx.fillStyle = palette.frame;
    ctx.fillRect(0, 0, size.width, size.height);
    drawBaseMap(ctx, viewport, palette);

    return layer;
  }, [size, viewport, palette]);

  // 每次时间或选中状态变化：贴底图 → 夜面 → 标注
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size || !viewport || !baseLayer) return;

    if (canvas.width !== baseLayer.width || canvas.height !== baseLayer.height) {
      canvas.width = baseLayer.width;
      canvas.height = baseLayer.height;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(baseLayer, 0, 0);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);

    drawNightShade(ctx, viewport, sunPosition, palette);
    drawOverlay(ctx, viewport, {
      sunPosition,
      boundary: dayNightBoundary,
      cities,
      selectedCityId: selectedCity,
      baseCityId: BASE_ZONE.cityId,
      utcTime: baseTime.toUTC(),
      palette,
    });
  }, [
    size,
    viewport,
    baseLayer,
    palette,
    sunPosition,
    dayNightBoundary,
    cities,
    selectedCity,
    baseTime,
  ]);

  // 离指针最近、且在命中半径内的城市
  const findCityAt = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !viewport) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let nearest: string | null = null;
    let nearestDistance = HIT_RADIUS;

    for (const city of cities) {
      const point = project(city.latitude, city.longitude, viewport);
      const distance = Math.hypot(x - point.x, y - point.y);
      if (distance < nearestDistance) {
        nearest = city.id;
        nearestDistance = distance;
      }
    }

    return nearest;
  };

  // 点城市选中，再点一次或点空白处取消
  const handleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const cityId = findCityAt(event.clientX, event.clientY);
    onCityClick?.(cityId === selectedCity ? null : cityId);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    setHoveringCity(findCityAt(event.clientX, event.clientY) !== null);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full ${
          hoveringCity ? 'cursor-pointer' : 'cursor-default'
        }`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveringCity(false)}
      />

      {/* 太阳直射点 */}
      <div
        className="absolute top-3 right-3 bg-slate-900/75 text-white rounded-lg
                   px-3 py-2 text-xs pointer-events-none"
      >
        <div className="text-slate-300">太阳直射点</div>
        <div className="font-mono text-sm">
          {formatCoordinate(sunPosition.declination, 'N', 'S')}
          {'  '}
          {formatCoordinate(sunPosition.longitude, 'E', 'W')}
        </div>
      </div>

      {/* 图例（窄屏会挡住地图，隐藏） */}
      <div
        className="hidden md:block absolute bottom-3 right-3 bg-slate-900/75 text-white rounded-lg
                   px-3 py-2 text-xs space-y-1 pointer-events-none"
      >
        <div className="flex items-center">
          <span
            className="w-2.5 h-2.5 rounded-full mr-2 border border-white"
            style={{ backgroundColor: MARKER_COLORS.cityDay }}
          />
          白天城市
        </div>
        <div className="flex items-center">
          <span
            className="w-2.5 h-2.5 rounded-full mr-2 border border-white"
            style={{ backgroundColor: MARKER_COLORS.cityNight }}
          />
          夜晚城市
        </div>
        <div className="flex items-center">
          <span
            className="w-2.5 h-2.5 rounded-full mr-2 border-2"
            style={{ borderColor: MARKER_COLORS.base }}
          />
          基准城市
        </div>
        <div className="flex items-center">
          <span
            className="w-2.5 h-2.5 rounded-full mr-2 border border-white"
            style={{ backgroundColor: MARKER_COLORS.sun }}
          />
          太阳直射点
        </div>
        <div className="flex items-center">
          <span className="w-2.5 mr-2 border-t border-dashed border-white/70" />
          晨昏线
        </div>
      </div>
    </div>
  );
};
