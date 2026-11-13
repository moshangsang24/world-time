import React, { useEffect, useMemo } from 'react';
import { DateTime } from 'luxon';
import { X } from 'lucide-react';
import { useTimeStore } from '@store/timeStore';
import { useSettingsStore } from '@store/settingsStore';
import { TimeCalculator } from '@utils/timeCalculations';

interface SettingsPanelProps {
  onClose: () => void;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) => (
  <div
    className="inline-flex p-0.5 rounded-lg bg-gray-100 dark:bg-gray-700"
    role="radiogroup"
    aria-label={label}
  >
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        role="radio"
        aria-checked={value === option.value}
        onClick={() => onChange(option.value)}
        className={`px-3 py-1 rounded-md text-sm transition-colors ${
          value === option.value
            ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-500 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const Row: React.FC<{
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="py-4 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between gap-4">
      <div className="font-medium text-gray-900 dark:text-white">{title}</div>
      <div className="flex-shrink-0">{children}</div>
    </div>
    {description && (
      <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        {description}
      </div>
    )}
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const cities = useTimeStore(state => state.cities);
  const baseZone = useTimeStore(state => state.baseZone);
  const baseCityId = useTimeStore(state => state.baseCityId);
  const followDeviceZone = useTimeStore(state => state.followDeviceZone);
  const setBaseCity = useTimeStore(state => state.setBaseCity);
  const setFollowDeviceZone = useTimeStore(
    state => state.setFollowDeviceZone
  );

  const theme = useSettingsStore(state => state.theme);
  const setTheme = useSettingsStore(state => state.setTheme);
  const cardStyle = useSettingsStore(state => state.cardStyle);
  const setCardStyle = useSettingsStore(state => state.setCardStyle);

  const deviceZone = useMemo(() => {
    const timezone = TimeCalculator.getDeviceTimeZone();
    return {
      timezone,
      offset: DateTime.now().setZone(timezone).toFormat('ZZ'),
    };
  }, []);

  // Esc 关闭
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedCities = useMemo(
    () => [...cities].sort((a, b) => a.name.localeCompare(b.name, 'zh')),
    [cities]
  );

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-full overflow-y-auto"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <h3
            id="settings-title"
            className="text-lg font-bold text-gray-900 dark:text-white"
          >
            设置
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            aria-label="关闭设置"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-2">
          <Row
            title="基准城市"
            description={
              followDeviceZone
                ? '已跟随设备时区，关闭下面的开关后可以手动选择。'
                : '顶栏时间、时差和“明天/昨天”都以它为准。也可以在城市卡片上点“设为基准”。'
            }
          >
            <select
              value={followDeviceZone ? baseZone.cityId ?? '' : baseCityId}
              disabled={followDeviceZone}
              onChange={event => setBaseCity(event.target.value)}
              aria-label="基准城市"
              className="w-40 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm
                         disabled:opacity-60"
            >
              {followDeviceZone && !baseZone.cityId && (
                <option value="">本机时间</option>
              )}
              {sortedCities.map(city => (
                <option key={city.id} value={city.id}>
                  {city.name}（UTC{city.currentTime.toFormat('ZZ')}）
                </option>
              ))}
            </select>
          </Row>

          <Row
            title="跟随设备时区"
            description={
              <>
                本机时区：{deviceZone.timezone}（UTC{deviceZone.offset}）。
                出差时电脑或手机自动改了时区，基准也会跟着变。
                {followDeviceZone && !baseZone.cityId && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    列表里没有这个时区的城市，地图上不会标出基准。可以在“添加城市”里搜索当地城市。
                  </span>
                )}
              </>
            }
          >
            <button
              type="button"
              role="switch"
              aria-checked={followDeviceZone}
              aria-label="跟随设备时区"
              onClick={() => setFollowDeviceZone(!followDeviceZone)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                followDeviceZone ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  followDeviceZone ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </Row>

          <Row title="城市卡片样式">
            <Segmented
              label="城市卡片样式"
              value={cardStyle}
              onChange={setCardStyle}
              options={[
                { value: 'digital', label: '数字' },
                { value: 'analog', label: '钟表' },
              ]}
            />
          </Row>

          <Row title="主题">
            <Segmented
              label="主题"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
                { value: 'auto', label: '跟随系统' },
              ]}
            />
          </Row>
        </div>
      </div>
    </div>
  );
};
