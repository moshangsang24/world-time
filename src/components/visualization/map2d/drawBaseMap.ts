import type { Position } from 'geojson';
import type { MapPalette } from './palette';
import { project, type MapViewport } from './projection';
import { BORDER_LINES, LAND_RINGS } from './worldData';

/** 画一条折线；相邻两点经度差超过 180° 说明跨了日界线，断开而不是横穿整张图 */
const traceLine = (
  ctx: CanvasRenderingContext2D,
  line: Position[],
  viewport: MapViewport
) => {
  let previousLng: number | null = null;

  for (const [lng, lat] of line) {
    const { x, y } = project(lat, lng, viewport);

    if (previousLng === null || Math.abs(lng - previousLng) > 180) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    previousLng = lng;
  }
};

/**
 * 画一个闭合的环。环不能像折线那样断开（断开后填充会沿断点连出一条斜边），
 * 所以跨日界线时把经度"展开"到 ±180° 以外继续画，
 * 再整体平移 360° 补画一份，让越界的那部分出现在地图另一侧。
 */
const traceRing = (
  ctx: CanvasRenderingContext2D,
  ring: Position[],
  viewport: MapViewport
) => {
  const unwrapped: Position[] = [];
  let offset = 0;
  let minLng = Infinity;
  let maxLng = -Infinity;

  ring.forEach(([lng, lat], index) => {
    if (index > 0) {
      const delta = lng - ring[index - 1][0];
      if (delta > 180) offset -= 360;
      if (delta < -180) offset += 360;
    }
    const continuousLng = lng + offset;
    minLng = Math.min(minLng, continuousLng);
    maxLng = Math.max(maxLng, continuousLng);
    unwrapped.push([continuousLng, lat]);
  });

  const shifts = [0];
  if (maxLng > 180) shifts.push(-360);
  if (minLng < -180) shifts.push(360);

  for (const shift of shifts) {
    unwrapped.forEach(([lng, lat], index) => {
      const { x, y } = project(lat, lng + shift, viewport);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
  }
};

/**
 * 绘制不随时间变化的底图：海洋、经纬网、陆地、国界。
 * 调用方应把结果缓存起来，只在尺寸或主题变化时重画。
 */
export const drawBaseMap = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  palette: MapPalette
) => {
  const { x, y, width, height } = viewport;

  // 海洋
  ctx.fillStyle = palette.ocean;
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  // 陆地
  ctx.beginPath();
  for (const ring of LAND_RINGS) {
    traceRing(ctx, ring, viewport);
  }
  ctx.fillStyle = palette.land;
  ctx.fill('evenodd');
  ctx.strokeStyle = palette.coastline;
  ctx.lineWidth = 0.75;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // 国界
  ctx.beginPath();
  for (const line of BORDER_LINES) {
    traceLine(ctx, line, viewport);
  }
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 经纬网（每 30°），赤道略深
  ctx.beginPath();
  for (let lng = -150; lng <= 150; lng += 30) {
    const lineX = project(0, lng, viewport).x;
    ctx.moveTo(lineX, y);
    ctx.lineTo(lineX, y + height);
  }
  for (const lat of [-60, -30, 30, 60]) {
    const lineY = project(lat, 0, viewport).y;
    ctx.moveTo(x, lineY);
    ctx.lineTo(x + width, lineY);
  }
  ctx.strokeStyle = palette.graticule;
  ctx.lineWidth = 1;
  ctx.stroke();

  const equatorY = project(0, 0, viewport).y;
  ctx.beginPath();
  ctx.moveTo(x, equatorY);
  ctx.lineTo(x + width, equatorY);
  ctx.strokeStyle = palette.equator;
  ctx.stroke();

  ctx.restore();
};
