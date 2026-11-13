import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';
import { I18nFormatters } from './formatters';
import { TimeCalculator, TimeFormatter } from './timeCalculations';

const LA = 'America/Los_Angeles';
const at = (iso: string, zone: string) =>
  DateTime.fromISO(iso, { zone: 'utc' }).setZone(zone);

describe('TimeFormatter', () => {
  it.each([
    [30, '+30分钟'],
    [-1, '-1分钟'],
    [60, '+1小时'],
    [-135, '-2小时15分钟'],
    [1440, '+24小时'],
  ])('formatOffsetMinutes(%i) = %s', (offset, expected) => {
    expect(TimeFormatter.formatOffsetMinutes(offset)).toBe(expected);
  });

  it('时区缩写随夏令时变化', () => {
    expect(
      TimeFormatter.formatZoneAbbr(at('2026-11-12T20:00:00Z', LA))
    ).toBe('PST');
    expect(TimeFormatter.formatZoneAbbr(at('2026-07-01T20:00:00Z', LA))).toBe(
      'PDT'
    );
  });

  it('没有通用缩写的时区显示为 UTC 偏移', () => {
    const instant = '2026-11-12T20:00:00Z';
    expect(TimeFormatter.formatZoneAbbr(at(instant, 'Asia/Tokyo'))).toBe(
      'UTC+09:00'
    );
    expect(TimeFormatter.formatZoneAbbr(at(instant, 'Asia/Kolkata'))).toBe(
      'UTC+05:30'
    );
    expect(TimeFormatter.formatZoneAbbr(at(instant, 'Europe/London'))).toBe(
      'GMT'
    );
  });
});

describe('TimeCalculator.differenceFromZone', () => {
  // 2026-11-12 20:00 UTC = 洛杉矶 12:00 PST
  const instant = '2026-11-12T20:00:00Z';

  it.each([
    ['America/Los_Angeles', 0, 0],
    ['America/New_York', 3, 0],
    ['Europe/London', 8, 0],
    ['Asia/Kolkata', 13.5, 1],
    ['Asia/Shanghai', 16, 1],
    ['Australia/Sydney', 19, 1],
  ])('%s 比洛杉矶快 %d 小时，日期差 %d 天', (zone, hours, dayDelta) => {
    expect(TimeCalculator.differenceFromZone(at(instant, zone), LA)).toEqual({
      hours,
      dayDelta,
    });
  });

  it('夏令时期间时差按实际偏移计算', () => {
    // 7 月：洛杉矶 PDT(-7)，北京仍是 +8，时差 15 小时
    const summer = at('2026-07-01T20:00:00Z', 'Asia/Shanghai');
    expect(TimeCalculator.differenceFromZone(summer, LA).hours).toBe(15);
  });

  it('基准在别的时区时可以是昨天', () => {
    const la = at('2026-11-12T20:00:00Z', LA);
    expect(TimeCalculator.differenceFromZone(la, 'Asia/Shanghai')).toEqual({
      hours: -16,
      dayDelta: -1,
    });
  });
});

describe('I18nFormatters 按 DateTime 自己的时区格式化', () => {
  // 同一时刻：洛杉矶是周四，北京已经是周五
  const instant = '2026-11-12T20:00:00Z';

  it('星期不受运行环境时区影响', () => {
    expect(I18nFormatters.formatWeekday(at(instant, LA), 'zh')).toBe('星期四');
    expect(
      I18nFormatters.formatWeekday(at(instant, 'Asia/Shanghai'), 'zh')
    ).toBe('星期五');
  });
});
