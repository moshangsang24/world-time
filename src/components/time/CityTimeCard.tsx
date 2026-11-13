import React from 'react';
import { Pin, X } from 'lucide-react';
import type { CityTimeData } from '@/types/time';
import { TimeCalculator, TimeFormatter } from '@utils/timeCalculations';
import { SunPositionCalculator } from '@utils/sunCalculations';
import { AnalogClock } from './AnalogClock';

interface CityTimeCardProps {
  city: CityTimeData;
  variant: 'digital' | 'analog';
  baseTimezone: string;
  isSelected?: boolean;
  isBase?: boolean; // 是否为基准城市
  canRemove?: boolean;
  onSelect?: (cityId: string) => void;
  onRemove?: (cityId: string) => void;
  onSetBase?: (cityId: string) => void;
}

// 昼夜用整张卡片的底色表达：白天暖白，夜晚深蓝
const SURFACE = {
  day: `bg-gradient-to-br from-amber-50 to-orange-50/60 border-amber-200/80 text-slate-900
        dark:from-amber-300/20 dark:to-amber-200/5 dark:border-amber-200/25 dark:text-amber-50`,
  night: `bg-gradient-to-br from-slate-800 to-indigo-950 border-slate-700 text-slate-50
          dark:from-slate-900 dark:to-indigo-950 dark:border-indigo-900/70`,
};
const MUTED = {
  day: 'text-amber-950/55 dark:text-amber-100/70',
  night: 'text-indigo-200/70',
};

/** "快 3 小时" / "慢 8 小时" / 基准城市显示时区缩写 */
const describeDifference = (
  city: CityTimeData,
  baseTimezone: string,
  isBase: boolean
) => {
  const { hours, dayDelta } = TimeCalculator.differenceFromZone(
    city.currentTime,
    baseTimezone
  );
  const offsetText = isBase
    ? TimeFormatter.formatZoneAbbr(city.currentTime)
    : hours === 0
      ? '同一时间'
      : `${hours > 0 ? '快' : '慢'} ${Math.abs(hours)} 小时`;
  const dayText = dayDelta > 0 ? '明天' : dayDelta < 0 ? '昨天' : null;

  return { offsetText, dayText };
};

/** 选中时显示的日出日落 */
const describeSun = (city: CityTimeData) => {
  const { sunrise, sunset, polar } = SunPositionCalculator.sunTimesFor(
    city.currentTime,
    city.latitude,
    city.longitude
  );
  if (polar === 'day') return '今天极昼，太阳不落';
  if (polar === 'night') return '今天极夜，太阳不升';
  return `日出 ${sunrise!.toFormat('HH:mm')} · 日落 ${sunset!.toFormat('HH:mm')}`;
};

export const CityTimeCard: React.FC<CityTimeCardProps> = ({
  city,
  variant,
  baseTimezone,
  isSelected = false,
  isBase = false,
  canRemove = false,
  onSelect,
  onRemove,
  onSetBase,
}) => {
  const tone = city.isDaytime ? 'day' : 'night';
  const { offsetText, dayText } = describeDifference(
    city,
    baseTimezone,
    isBase
  );
  const dateText = city.currentTime
    .setLocale('zh-CN')
    .toFormat('M月d日 ccc');
  const detailText = isSelected ? describeSun(city) : dateText;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect?.(city.id);
    }
  };

  const stop =
    (action?: (cityId: string) => void) => (event: React.MouseEvent) => {
      event.stopPropagation();
      action?.(city.id);
    };

  // 移除和设为基准：选中的卡片始终显示；桌面端另外在悬停或聚焦时显示。
  // 触屏没有悬停，先点一下选中卡片再操作，避免每张卡片都堆着按钮。
  const actions = (
    <div
      className={`absolute -top-3 right-2 z-10 gap-1 transition-opacity duration-150 ${
        isSelected
          ? 'flex'
          : 'hidden md:flex md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100'
      }`}
    >
      {!isBase && onSetBase && (
        <button
          type="button"
          onClick={stop(onSetBase)}
          className="flex items-center gap-1 h-5 px-2 rounded-full text-[11px] font-medium shadow
                     bg-white text-slate-700 hover:bg-primary-50 hover:text-primary-700
                     dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          title={`以${city.name}时间为基准`}
        >
          <Pin className="w-3 h-3" />
          设为基准
        </button>
      )}
      {canRemove && !isBase && onRemove && (
        <button
          type="button"
          onClick={stop(onRemove)}
          className="flex items-center justify-center w-5 h-5 rounded-full shadow
                     bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600
                     dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          aria-label={`移除${city.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );

  const badges = (
    <>
      {isBase && (
        <span className="px-1.5 py-px rounded-full text-[10px] font-semibold bg-rose-600 text-white">
          基准
        </span>
      )}
      {dayText && (
        <span
          className={`px-1.5 py-px rounded-full text-[10px] font-medium ${
            city.isDaytime
              ? 'bg-amber-900/10 text-amber-950/70 dark:bg-amber-100/15 dark:text-amber-50'
              : 'bg-white/15 text-indigo-100'
          }`}
        >
          {dayText}
        </span>
      )}
    </>
  );

  const container = `group relative rounded-xl border cursor-pointer select-none
    transition-shadow duration-150 hover:shadow-md focus:outline-none
    focus-visible:ring-2 focus-visible:ring-primary-500
    ${SURFACE[tone]}
    ${
      isSelected
        ? 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
        : ''
    }`;

  if (variant === 'analog') {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onClick={() => onSelect?.(city.id)}
        onKeyDown={handleKeyDown}
        className={`${container} flex flex-col items-center px-2 pt-4 pb-3 text-center`}
      >
        {actions}
        <AnalogClock
          time={city.currentTime}
          size={92}
          isDaytime={city.isDaytime}
        />
        <div className="mt-2 flex items-center justify-center gap-1.5 min-w-0 max-w-full">
          <span className="font-semibold truncate">{city.name}</span>
          {isBase && badges}
        </div>
        <div className="font-mono text-base font-semibold tabular-nums">
          {city.currentTime.toFormat('HH:mm')}
        </div>
        <div className={`text-xs ${MUTED[tone]} truncate max-w-full`}>
          {[offsetText, dayText].filter(Boolean).join(' · ')}
        </div>
        {isSelected && (
          <div className={`mt-1 text-[11px] ${MUTED[tone]}`}>{detailText}</div>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect?.(city.id)}
      onKeyDown={handleKeyDown}
      className={`${container} flex items-center gap-3 px-3 py-3`}
    >
      {actions}
      <AnalogClock
        time={city.currentTime}
        size={42}
        isDaytime={city.isDaytime}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold truncate">{city.name}</span>
          {badges}
        </div>
        <div className={`text-xs truncate ${MUTED[tone]}`}>
          {[city.country, offsetText].filter(Boolean).join(' · ')}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="font-mono tabular-nums leading-none">
          <span className="text-2xl font-semibold tracking-tight">
            {city.currentTime.toFormat('HH:mm')}
          </span>
          <span className={`ml-0.5 text-sm ${MUTED[tone]}`}>
            {city.currentTime.toFormat('ss')}
          </span>
        </div>
        <div className={`mt-1 text-xs ${MUTED[tone]}`}>{detailText}</div>
      </div>
    </div>
  );
};
