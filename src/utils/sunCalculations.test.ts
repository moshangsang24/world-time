import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import * as SunCalc from 'suncalc';
import { MAJOR_CITIES } from '@data/cities';
import { SunPositionCalculator } from './sunCalculations';

const RAD_TO_DEG = 180 / Math.PI;
const utc = (iso: string) => DateTime.fromISO(iso, { zone: 'utc' });

// 固定种子的伪随机数，保证测试可复现
const createRandom = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

describe('SunPositionCalculator.calculateSunPosition', () => {
  it.each([
    { iso: '2025-06-21T12:00:00Z', lng: 0 },
    { iso: '2025-03-20T12:00:00Z', lng: 0 },
    { iso: '2025-12-21T12:00:00Z', lng: 0 },
    { iso: '2025-10-22T04:00:00Z', lng: 120 },
    { iso: '2026-11-12T20:00:00Z', lng: -120 }, // 洛杉矶正午前后
  ])('$iso 的直射点经度约为 $lng°', ({ iso, lng }) => {
    const { longitude } = SunPositionCalculator.calculateSunPosition(utc(iso));

    // 均时差最大约 ±16.5 分钟，即 ±4.1°
    expect(Math.abs(longitude - lng)).toBeLessThan(4.2);
  });

  it('直射点处的太阳高度角接近 90°（对照 SunCalc）', () => {
    const random = createRandom(7);

    for (let i = 0; i < 50; i++) {
      const time = utc('2025-01-01T00:00:00Z').plus({
        minutes: Math.floor(random() * 2 * 365 * 1440),
      });
      const sun = SunPositionCalculator.calculateSunPosition(time);
      const altitude =
        SunCalc.getPosition(time.toJSDate(), sun.declination, sun.longitude)
          .altitude * RAD_TO_DEG;

      expect(altitude).toBeGreaterThan(89.5);
    }
  });

  it('直射点一天向西移动约 360°，一小时约 15°', () => {
    const start = utc('2026-11-12T00:00:00Z');
    const a = SunPositionCalculator.calculateSunPosition(start).longitude;
    const b = SunPositionCalculator.calculateSunPosition(
      start.plus({ hours: 1 })
    ).longitude;

    expect((a - b + 360) % 360).toBeCloseTo(15, 1);
  });

  it('二至日赤纬约 ±23.44°，二分日约 0°', () => {
    const declination = (iso: string) =>
      SunPositionCalculator.calculateSunPosition(utc(iso)).declination;

    expect(declination('2025-06-21T03:00:00Z')).toBeCloseTo(23.44, 1);
    expect(declination('2025-12-21T15:00:00Z')).toBeCloseTo(-23.44, 1);
    expect(Math.abs(declination('2025-03-20T09:00:00Z'))).toBeLessThan(0.05);
  });

  it('结果与 DateTime 所在时区无关', () => {
    const instant = utc('2026-11-12T20:00:00Z');
    const a = SunPositionCalculator.calculateSunPosition(instant);
    const b = SunPositionCalculator.calculateSunPosition(
      instant.setZone('America/Los_Angeles')
    );
    const c = SunPositionCalculator.calculateSunPosition(
      instant.setZone('Asia/Shanghai')
    );

    expect(b).toEqual(a);
    expect(c).toEqual(a);
  });
});

describe('SunPositionCalculator 昼夜判断', () => {
  it('各城市的太阳高度角与 SunCalc 一致', () => {
    const random = createRandom(42);

    for (let i = 0; i < 50; i++) {
      const time = utc('2025-01-01T00:00:00Z').plus({
        minutes: Math.floor(random() * 2 * 365 * 1440),
      });
      const sun = SunPositionCalculator.calculateSunPosition(time);

      for (const city of MAJOR_CITIES) {
        const ours = SunPositionCalculator.altitudeAt(
          city.latitude,
          city.longitude,
          sun
        );
        const reference =
          SunCalc.getPosition(time.toJSDate(), city.latitude, city.longitude)
            .altitude * RAD_TO_DEG;

        expect(Math.abs(ours - reference)).toBeLessThan(0.3);
      }
    }
  });

  it('2025-06-21T04:00Z 北京是白天，纽约是夜晚', () => {
    const sun = SunPositionCalculator.calculateSunPosition(
      utc('2025-06-21T04:00:00Z')
    );

    expect(SunPositionCalculator.isDaylight(39.9042, 116.4074, sun)).toBe(true);
    expect(SunPositionCalculator.isDaylight(40.7128, -74.006, sun)).toBe(false);
  });

  it('洛杉矶当地正午是白天，午夜是夜晚', () => {
    const noon = DateTime.fromISO('2026-11-12T12:00:00', {
      zone: 'America/Los_Angeles',
    });
    const isDay = (time: DateTime) =>
      SunPositionCalculator.isDaylight(
        34.0522,
        -118.2437,
        SunPositionCalculator.calculateSunPosition(time)
      );

    expect(isDay(noon)).toBe(true);
    expect(isDay(noon.plus({ hours: 12 }))).toBe(false);
  });

  it('极昼极夜：6 月北极全天白昼，南极全天黑夜', () => {
    for (let hour = 0; hour < 24; hour += 3) {
      const sun = SunPositionCalculator.calculateSunPosition(
        utc('2025-06-21T00:00:00Z').plus({ hours: hour })
      );

      expect(SunPositionCalculator.isDaylight(85, 0, sun)).toBe(true);
      expect(SunPositionCalculator.isDaylight(-85, 0, sun)).toBe(false);
    }
  });
});

describe('SunPositionCalculator.calculateDayNightBoundary', () => {
  it.each([
    '2025-06-21T04:00:00Z',
    '2025-12-21T16:00:00Z',
    '2025-03-20T09:01:00Z', // 春分
    '2025-09-22T18:19:00Z', // 秋分
    '2026-11-12T20:00:00Z',
  ])('%s 的晨昏线上太阳高度角为 0°', iso => {
    const sun = SunPositionCalculator.calculateSunPosition(utc(iso));
    const { points } = SunPositionCalculator.calculateDayNightBoundary(sun);

    expect(points).toHaveLength(181);

    for (const point of points) {
      expect(Number.isFinite(point.lat)).toBe(true);
      expect(Math.abs(point.lat)).toBeLessThanOrEqual(90);
      // 春秋分时赤纬被钳到 0.01°，允许同量级的误差
      expect(
        Math.abs(SunPositionCalculator.altitudeAt(point.lat, point.lng, sun))
      ).toBeLessThan(0.05);
    }
  });
});
