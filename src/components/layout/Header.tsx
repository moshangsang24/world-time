import React from 'react';
import { Globe, Settings, Info, Moon, Sun } from 'lucide-react';
import { useTimeState } from '@hooks/useTimeState';
import { useSettingsStore } from '@store/settingsStore';
import { Button } from '@components/common/Button';

interface HeaderProps {
  onSettingsClick?: () => void;
  onInfoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSettingsClick,
  onInfoClick,
}) => {
  const { formattedBaseTime, formattedTimeOffset, isRealTime } = useTimeState();
  const { theme, setTheme } = useSettingsStore();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 
                     px-4 py-3 flex items-center justify-between">
      {/* 左侧 - 标题和状态 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Globe className="w-6 h-6 text-primary-500" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            世界时间可视化
          </h1>
        </div>
        
        <div className="hidden md:flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              isRealTime ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
            }`} />
            <span className="text-gray-600 dark:text-gray-400">
              {isRealTime ? '实时模式' : '已暂停'}
            </span>
          </div>
          
          <div className="text-gray-600 dark:text-gray-400">
            {formattedBaseTime.label}: {formattedBaseTime.time}{' '}
            {formattedBaseTime.zoneAbbr}
          </div>
          
          {formattedTimeOffset && (
            <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 
                          text-yellow-800 dark:text-yellow-400 rounded text-xs">
              偏移: {formattedTimeOffset}
            </div>
          )}
        </div>
      </div>

      {/* 右侧 - 控制按钮 */}
      <div className="flex items-center space-x-2">
        {/* 主题切换 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          icon={theme === 'dark' ? Sun : Moon}
          aria-label="切换主题"
        />

        {/* 设置按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onSettingsClick}
          icon={Settings}
          aria-label="设置"
        />

        {/* 帮助按钮 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onInfoClick}
          icon={Info}
          aria-label="帮助信息"
        />
      </div>
    </header>
  );
};