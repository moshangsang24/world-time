import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DateTime } from 'luxon';
import { Check, Globe2, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { MAJOR_CITIES } from '@data/cities';
import { useTimeStore } from '@store/timeStore';
import {
  CitySearchError,
  searchCities,
  type CitySearchResult,
} from '@utils/geocoding';
import type { CityData } from '@/types/time';

interface AddCityPanelProps {
  /** 打开面板时自动聚焦搜索框 */
  autoFocus?: boolean;
}

type SearchStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; results: CitySearchResult[] }
  | { state: 'error'; message: string };

const SEARCH_DEBOUNCE_MS = 300;

const matchesQuery = (city: CityData, query: string) => {
  const q = query.trim().toLowerCase();
  return (
    city.name.toLowerCase().includes(q) ||
    city.nameEn.toLowerCase().includes(q) ||
    city.country.toLowerCase().includes(q) ||
    city.timezone.toLowerCase().includes(q)
  );
};

/** 在线结果如果就是某个预置城市（同时区、相距很近），改用预置城市，避免重复 */
const findPresetMatch = (city: CityData): CityData | undefined =>
  MAJOR_CITIES.find(
    preset =>
      preset.timezone === city.timezone &&
      Math.abs(preset.latitude - city.latitude) < 0.3 &&
      Math.abs(preset.longitude - city.longitude) < 0.3
  );

interface CityOptionProps {
  name: string;
  detail: string;
  timezone: string;
  now: DateTime;
  isAdded: boolean;
  onAdd: () => void;
}

const CityOption: React.FC<CityOptionProps> = ({
  name,
  detail,
  timezone,
  now,
  isAdded,
  onAdd,
}) => {
  const localTime = now.setZone(timezone);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isAdded}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
                  transition-colors duration-150 ${
                    isAdded
                      ? 'cursor-default opacity-60'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
    >
      <MapPin className="w-4 h-4 flex-shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900 dark:text-white truncate">
          {name}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {detail}
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <div className="font-mono text-sm text-slate-700 dark:text-slate-200 tabular-nums">
          {localTime.toFormat('HH:mm')}
        </div>
        <div className="text-[11px] text-slate-400">
          UTC{localTime.toFormat('ZZ')}
        </div>
      </div>
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
          isAdded
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'bg-primary-500 text-white'
        }`}
        aria-label={isAdded ? '已添加' : `添加${name}`}
      >
        {isAdded ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </span>
    </button>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
    {children}
  </h3>
);

export const AddCityPanel: React.FC<AddCityPanelProps> = ({
  autoFocus = false,
}) => {
  const selectedCities = useTimeStore(state => state.selectedCities);
  const addCity = useTimeStore(state => state.addCity);
  const addCustomCity = useTimeStore(state => state.addCustomCity);
  // 只精确到分钟，避免每秒重新渲染整个列表
  const nowMillis = useTimeStore(state =>
    state.baseTime.startOf('minute').toMillis()
  );
  const now = useMemo(() => DateTime.fromMillis(nowMillis), [nowMillis]);

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>({ state: 'idle' });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // 输入停顿 300 ms 后搜索；新的输入会取消上一次请求
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus({ state: 'idle' });
      return;
    }

    const controller = new AbortController();
    setStatus({ state: 'loading' });

    const timer = setTimeout(() => {
      searchCities(trimmed, controller.signal)
        .then(results => setStatus({ state: 'done', results }))
        .catch(error => {
          if (controller.signal.aborted) return;
          setStatus({
            state: 'error',
            message:
              error instanceof CitySearchError ? error.message : '搜索失败',
          });
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // 预置城市：没输入时全部列出，按当前 UTC 偏移排序；输入后本地过滤
  const presetCities = useMemo(() => {
    const list = query.trim()
      ? MAJOR_CITIES.filter(city => matchesQuery(city, query))
      : MAJOR_CITIES;
    return [...list].sort(
      (a, b) =>
        now.setZone(a.timezone).offset - now.setZone(b.timezone).offset ||
        a.name.localeCompare(b.name)
    );
  }, [query, now]);

  // 在线结果去掉和上面预置城市重复的
  const onlineResults = useMemo(() => {
    if (status.state !== 'done') return [];
    const shownPresetIds = new Set(presetCities.map(city => city.id));
    return status.results.filter(result => {
      const preset = findPresetMatch(result.city);
      return !preset || !shownPresetIds.has(preset.id);
    });
  }, [status, presetCities]);

  const handleAddOnline = (result: CitySearchResult) => {
    const preset = findPresetMatch(result.city);
    if (preset) {
      addCity(preset.id);
    } else {
      addCustomCity(result.city);
    }
  };

  const isOnlineAdded = (result: CitySearchResult) => {
    const preset = findPresetMatch(result.city);
    return selectedCities.includes(preset?.id ?? result.city.id);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* 搜索框 */}
      <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
          添加城市
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            placeholder="搜索任意城市，如 深圳、Austin、Reykjavik"
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-600
                       bg-white dark:bg-slate-800 text-slate-900 dark:text-white
                       placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600"
              aria-label="清空搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          在线搜索由 Open-Meteo 提供，输入的城市名会发送给该服务。
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-1 pb-4">
        {/* 在线搜索结果 */}
        {hasQuery && (
          <section>
            <SectionTitle>在线搜索</SectionTitle>
            {status.state === 'loading' && (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                搜索中…
              </div>
            )}
            {status.state === 'error' && (
              <div className="mx-3 my-2 px-3 py-2 rounded-lg text-sm bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {status.message}，暂时只能从下方常用城市中添加。
              </div>
            )}
            {status.state === 'done' && onlineResults.length === 0 && (
              <div className="px-3 py-3 text-sm text-slate-500">
                没有找到“{query.trim()}”，换个写法试试（中文、英文都可以）。
              </div>
            )}
            {onlineResults.map(result => (
              <CityOption
                key={result.city.id}
                name={result.city.name}
                detail={[result.region, result.city.country]
                  .filter(Boolean)
                  .join(' · ')}
                timezone={result.city.timezone}
                now={now}
                isAdded={isOnlineAdded(result)}
                onAdd={() => handleAddOnline(result)}
              />
            ))}
          </section>
        )}

        {/* 预置城市（离线可用） */}
        {presetCities.length > 0 && (
          <section>
            <SectionTitle>常用城市</SectionTitle>
            {presetCities.map(city => (
              <CityOption
                key={city.id}
                name={city.name}
                detail={city.country}
                timezone={city.timezone}
                now={now}
                isAdded={selectedCities.includes(city.id)}
                onAdd={() => addCity(city.id)}
              />
            ))}
          </section>
        )}

        {!hasQuery && (
          <div className="flex items-center gap-2 px-3 pt-4 text-xs text-slate-400">
            <Globe2 className="w-4 h-4" />
            不在列表里的城市，在上方搜索即可。
          </div>
        )}
      </div>
    </div>
  );
};
