import { describe, expect, it } from 'vitest';
import { nightIntensity } from './drawNightShade';
import { fitViewport, project } from './projection';
import { BORDER_LINES, LAND_RINGS } from './worldData';

describe('fitViewport', () => {
  it('容器比 2:1 更高时，按宽度铺满并上下留边', () => {
    expect(fitViewport(1000, 800)).toEqual({
      x: 0,
      y: 150,
      width: 1000,
      height: 500,
    });
  });

  it('容器比 2:1 更宽时，按高度铺满并左右留边', () => {
    expect(fitViewport(1000, 300)).toEqual({
      x: 200,
      y: 0,
      width: 600,
      height: 300,
    });
  });
});

describe('project', () => {
  const viewport = { x: 10, y: 20, width: 720, height: 360 };

  it.each([
    { lat: 90, lng: -180, x: 10, y: 20 }, // 左上角
    { lat: 0, lng: 0, x: 370, y: 200 }, // 中心
    { lat: -90, lng: 180, x: 730, y: 380 }, // 右下角
    { lat: 34.0522, lng: -118.2437, x: 133.5126, y: 131.8956 }, // 洛杉矶
  ])('($lat, $lng) → ($x, $y)', ({ lat, lng, x, y }) => {
    const point = project(lat, lng, viewport);

    expect(point.x).toBeCloseTo(x, 3);
    expect(point.y).toBeCloseTo(y, 3);
  });
});

describe('nightIntensity', () => {
  it('白昼为 0，天文夜为 1，曙暮光区间单调加深', () => {
    expect(nightIntensity(30)).toBe(0);
    expect(nightIntensity(0)).toBe(0);
    expect(nightIntensity(-18)).toBe(1);
    expect(nightIntensity(-60)).toBe(1);

    const twilight = [-1, -6, -12, -17].map(nightIntensity);
    expect(twilight).toEqual([...twilight].sort((a, b) => a - b));
    expect(twilight[0]).toBeGreaterThan(0);
    expect(twilight[3]).toBeLessThan(1);
  });
});

describe('世界地图数据', () => {
  it('陆地和国界数据已加载，坐标在合法范围内', () => {
    expect(LAND_RINGS.length).toBeGreaterThan(100);
    expect(BORDER_LINES.length).toBeGreaterThan(100);

    for (const ring of LAND_RINGS) {
      for (const [lng, lat] of ring) {
        expect(Math.abs(lng)).toBeLessThanOrEqual(180);
        expect(Math.abs(lat)).toBeLessThanOrEqual(90);
      }
    }
  });
});
