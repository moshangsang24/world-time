import React from 'react';
import type { DateTime } from 'luxon';

interface AnalogClockProps {
  time: DateTime;
  size: number;
  isDaytime: boolean;
  showSeconds?: boolean;
}

const CENTER = 50;

const polar = (degrees: number, length: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + Math.sin(radians) * length,
    y: CENTER - Math.cos(radians) * length,
  };
};

/** 钟面：白天浅底深色指针，夜晚深底浅色指针，秒针红色 */
export const AnalogClock: React.FC<AnalogClockProps> = ({
  time,
  size,
  isDaytime,
  showSeconds = true,
}) => {
  const hourAngle = (time.hour % 12) * 30 + time.minute * 0.5;
  const minuteAngle = time.minute * 6 + time.second * 0.1;
  const secondAngle = time.second * 6;

  // 小钟面上刻度太密会糊，只画 4 个主刻度
  const compact = size < 60;
  const ticks = Array.from({ length: compact ? 4 : 12 }, (_, index) =>
    compact ? index * 3 : index
  );

  const face = isDaytime
    ? 'fill-white stroke-amber-200 dark:fill-amber-50 dark:stroke-amber-200/60'
    : 'fill-slate-900 stroke-indigo-400/40';
  const ink = isDaytime ? 'stroke-slate-800' : 'stroke-slate-100';

  const hand = (angle: number, length: number, width: number) => {
    const end = polar(angle, length);
    return (
      <line
        x1={CENTER}
        y1={CENTER}
        x2={end.x}
        y2={end.y}
        strokeWidth={width}
        strokeLinecap="round"
        className={ink}
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={time.toFormat('HH:mm')}
      className="flex-shrink-0"
    >
      <circle cx={CENTER} cy={CENTER} r={47} strokeWidth={3} className={face} />
      {ticks.map(hour => {
        const major = hour % 3 === 0;
        const outer = polar(hour * 30, 40);
        const inner = polar(hour * 30, major ? 32 : 35);
        return (
          <line
            key={hour}
            x1={inner.x}
            y1={inner.y}
            x2={outer.x}
            y2={outer.y}
            strokeWidth={major ? 3.5 : 2}
            strokeLinecap="round"
            className={ink}
            opacity={major ? 0.75 : 0.35}
          />
        );
      })}
      {hand(hourAngle, 22, compact ? 6 : 5)}
      {hand(minuteAngle, 33, compact ? 4.5 : 3.5)}
      {showSeconds && !compact && (
        <line
          x1={polar(secondAngle + 180, 8).x}
          y1={polar(secondAngle + 180, 8).y}
          x2={polar(secondAngle, 37).x}
          y2={polar(secondAngle, 37).y}
          strokeWidth={1.5}
          strokeLinecap="round"
          className="stroke-rose-500"
        />
      )}
      <circle cx={CENTER} cy={CENTER} r={compact ? 4.5 : 3.5} className="fill-rose-500" />
    </svg>
  );
};
