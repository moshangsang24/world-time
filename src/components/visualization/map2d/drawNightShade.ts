import type { SunPosition } from '@/types/geography';
import type { MapPalette } from './palette';
import type { MapViewport } from './projection';

// 夜面按 1° 网格逐格计算太阳高度角，再平滑放大到画布。
// 相比"求晨昏线多边形再填充"，这种做法没有象限、跨 ±180° 环绕、
// 春秋分退化等特殊情况，曙暮光过渡也是自然得到的。
const GRID_WIDTH = 360;
const GRID_HEIGHT = 180;
const DEG_TO_RAD = Math.PI / 180;

/** 天文曙暮光结束时的太阳高度角：低于它就是完全的夜 */
const ASTRONOMICAL_TWILIGHT = -18;

let gridCanvas: HTMLCanvasElement | null = null;
let gridImage: ImageData | null = null;

/**
 * 太阳高度角 → 夜面深浅，返回 0（白昼）到 1（完全的夜）。
 * 用开方而不是线性，让晨昏线附近的明暗变化更明显。
 */
export const nightIntensity = (altitude: number): number => {
  if (altitude >= 0) return 0;
  if (altitude <= ASTRONOMICAL_TWILIGHT) return 1;
  return Math.sqrt(altitude / ASTRONOMICAL_TWILIGHT);
};

export const drawNightShade = (
  ctx: CanvasRenderingContext2D,
  viewport: MapViewport,
  sunPosition: SunPosition,
  palette: MapPalette
) => {
  if (!gridCanvas) {
    gridCanvas = document.createElement('canvas');
    gridCanvas.width = GRID_WIDTH;
    gridCanvas.height = GRID_HEIGHT;
  }
  const gridCtx = gridCanvas.getContext('2d');
  if (!gridCtx) return;
  if (!gridImage) {
    gridImage = gridCtx.createImageData(GRID_WIDTH, GRID_HEIGHT);
  }

  const sinDec = Math.sin(sunPosition.declination * DEG_TO_RAD);
  const cosDec = Math.cos(sunPosition.declination * DEG_TO_RAD);

  // 每列的 cos(时角) 只与经度有关，先算好
  const cosHourAngle = new Float64Array(GRID_WIDTH);
  for (let col = 0; col < GRID_WIDTH; col++) {
    const lng = -180 + col + 0.5;
    cosHourAngle[col] = Math.cos((lng - sunPosition.longitude) * DEG_TO_RAD);
  }

  const [red, green, blue] = palette.nightColor;
  const data = gridImage.data;

  for (let row = 0; row < GRID_HEIGHT; row++) {
    const lat = (90 - row - 0.5) * DEG_TO_RAD;
    const sinTerm = Math.sin(lat) * sinDec;
    const cosTerm = Math.cos(lat) * cosDec;

    for (let col = 0; col < GRID_WIDTH; col++) {
      const sinAltitude = sinTerm + cosTerm * cosHourAngle[col];
      const altitude =
        Math.asin(Math.max(-1, Math.min(1, sinAltitude))) / DEG_TO_RAD;

      const index = (row * GRID_WIDTH + col) * 4;
      data[index] = red;
      data[index + 1] = green;
      data[index + 2] = blue;
      data[index + 3] = Math.round(
        255 * palette.nightMaxAlpha * nightIntensity(altitude)
      );
    }
  }

  gridCtx.putImageData(gridImage, 0, 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(viewport.x, viewport.y, viewport.width, viewport.height);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    gridCanvas,
    viewport.x,
    viewport.y,
    viewport.width,
    viewport.height
  );
  ctx.restore();
};
