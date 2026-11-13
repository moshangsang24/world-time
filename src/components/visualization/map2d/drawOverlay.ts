import type { DateTime } from 'luxon';
import type { DayNightBoundary, SunPosition } from '@/types/geography';
import type { CityTimeData } from '@/types/time';
import { MARKER_COLORS, type MapPalette } from './palette';
import { project, type MapPoint, type MapViewport } from './projection';

export interface OverlayOptions {
  sunPosition: SunPosition;
  boundary: DayNightBoundary;
  cities: CityTimeData[];
  selectedCityId: string | null;
  baseCityId: string | null; // 没有基准城市时（跟随设备且无同时区城市）为 null
  utcTime: DateTime;
  palette: MapPalette;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const LABEL_FONT = '600 11px system-ui, -apple-system, sans-serif';
const SCALE_FONT = '10px system-ui, -apple-system, sans-serif';
const LABEL_HEIGHT = 14;
const SCALE_HEIGHT = 18;

const overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** 晨昏线：太阳几何高度角为 0° 的那条线 */
const drawTerminator = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  boundary: DayNightBoundary,
  palette: MapPalette
) => {
  ctx.beginPath();
  boundary.points.forEach((point, index) => {
    const { x, y } = project(point.lat, point.lng, viewport);
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = palette.terminator;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
};

/** 太阳画在真实直射点（纬度 = 赤纬） */
const drawSun = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  sunPosition: SunPosition
) => {
  const { x, y } = project(
    sunPosition.declination,
    sunPosition.longitude,
    viewport
  );
  const glowRadius = Math.max(40, viewport.width * 0.06);

  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  glow.addColorStop(0, `rgba(${MARKER_COLORS.sunGlow}, 0.55)`);
  glow.addColorStop(0.4, `rgba(${MARKER_COLORS.sunGlow}, 0.18)`);
  glow.addColorStop(1, `rgba(${MARKER_COLORS.sunGlow}, 0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 7, 0, 2 * Math.PI);
  ctx.fillStyle = MARKER_COLORS.sun;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
};

/** 底部刻度：每 30° 经线的地方平时（UTC + 经度 / 15 小时） */
const drawHourScale = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  utcTime: DateTime
) => {
  const top = viewport.y + viewport.height - SCALE_HEIGHT;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
  ctx.fillRect(viewport.x, top, viewport.width, SCALE_HEIGHT);

  ctx.font = SCALE_FONT;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 画布太窄时改为每 60° 一个
  const step = viewport.width < 520 ? 60 : 30;
  for (let lng = -180 + step; lng < 180; lng += step) {
    const { x } = project(0, lng, viewport);
    const localMeanTime = utcTime.plus({ minutes: lng * 4 });
    ctx.fillText(localMeanTime.toFormat('HH:mm'), x, top + SCALE_HEIGHT / 2);
  }
};

const drawCityDot = (
  ctx: CanvasRenderingContext2D,
  point: MapPoint,
  city: CityTimeData,
  isSelected: boolean,
  isBase: boolean
) => {
  const color = city.isDaytime
    ? MARKER_COLORS.cityDay
    : MARKER_COLORS.cityNight;
  const radius = isSelected ? 6 : 4;

  // 基准城市：外面多一圈
  if (isBase) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = MARKER_COLORS.base;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius + (isBase ? 8 : 5), 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = MARKER_COLORS.cityStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

/**
 * 给标签找一个不压住其他标签和城市点的位置：
 * 依次尝试上、右、左、下，都冲突时退回上方。
 */
const placeLabel = (
  point: MapPoint,
  textWidth: number,
  occupied: Box[],
  viewport: MapViewport
): Box => {
  const gap = 9;
  const half = textWidth / 2;
  const candidates: Box[] = [
    { left: point.x - half, top: point.y - gap - LABEL_HEIGHT, right: 0, bottom: 0 },
    { left: point.x + gap, top: point.y - LABEL_HEIGHT / 2, right: 0, bottom: 0 },
    { left: point.x - gap - textWidth, top: point.y - LABEL_HEIGHT / 2, right: 0, bottom: 0 },
    { left: point.x - half, top: point.y + gap, right: 0, bottom: 0 },
  ].map(box => ({
    ...box,
    right: box.left + textWidth,
    bottom: box.top + LABEL_HEIGHT,
  }));

  const minX = viewport.x + 2;
  const maxX = viewport.x + viewport.width - 2;
  const minY = viewport.y + 2;
  const maxY = viewport.y + viewport.height - SCALE_HEIGHT - 2;

  const fits = (box: Box) =>
    box.left >= minX &&
    box.right <= maxX &&
    box.top >= minY &&
    box.bottom <= maxY &&
    !occupied.some(other => overlaps(box, other));

  return candidates.find(fits) ?? candidates[0];
};

const drawCities = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  options: OverlayOptions
) => {
  const { cities, selectedCityId, baseCityId } = options;

  // 基准城市和选中城市最后画、最先占位，保证不被别的标签挤掉
  const priority = (city: CityTimeData) =>
    (city.id === selectedCityId ? 2 : 0) + (city.id === baseCityId ? 1 : 0);
  const ordered = [...cities].sort((a, b) => priority(b) - priority(a));

  const points = new Map(
    ordered.map(city => [
      city.id,
      project(city.latitude, city.longitude, viewport),
    ])
  );

  // 所有城市点先占位，标签不能压在点上
  const occupied: Box[] = ordered.map(city => {
    const point = points.get(city.id)!;
    return {
      left: point.x - 6,
      top: point.y - 6,
      right: point.x + 6,
      bottom: point.y + 6,
    };
  });

  ctx.font = LABEL_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';

  const labels = ordered.map(city => {
    const point = points.get(city.id)!;
    const text = `${city.name} ${city.currentTime.toFormat('HH:mm')}`;
    const box = placeLabel(point, ctx.measureText(text).width, occupied, viewport);
    occupied.push(box);
    return { city, point, text, box };
  });

  // 倒序绘制：优先级高的画在最上面
  for (const { city, point, text, box } of labels.reverse()) {
    drawCityDot(
      ctx,
      point,
      city,
      city.id === selectedCityId,
      city.id === baseCityId
    );

    ctx.font = LABEL_FONT;
    ctx.strokeStyle = MARKER_COLORS.labelHalo;
    ctx.lineWidth = 3;
    ctx.strokeText(text, box.left, box.top + LABEL_HEIGHT / 2);
    ctx.fillStyle = MARKER_COLORS.labelText;
    ctx.fillText(text, box.left, box.top + LABEL_HEIGHT / 2);
  }
};

/** 绘制随时间变化的标注：晨昏线、太阳、时间刻度、城市 */
export const drawOverlay = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  options: OverlayOptions
) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();

  drawTerminator(ctx, viewport, options.boundary, options.palette);
  drawSun(ctx, viewport, options.sunPosition);
  drawHourScale(ctx, viewport, options.utcTime);
  drawCities(ctx, viewport, options);

  ctx.restore();
};
