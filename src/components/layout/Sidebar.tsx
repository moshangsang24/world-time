import React, { useState, useCallback } from 'react';
import { Clock, Globe2, List, Plus, X } from 'lucide-react';
import { WorldClock } from '@components/time/WorldClock';
import { TimezoneSelector } from '@components/time/TimezoneSelector';
import { useBreakpoint } from '@hooks/useWindowSize';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

type SidebarView = 'worldclock' | 'timezone-selector';

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
}) => {
  const [currentView, setCurrentView] = useState<SidebarView>('worldclock');
  const { isMd } = useBreakpoint();

  const handleViewChange = useCallback((view: SidebarView) => {
    setCurrentView(view);
    // 在移动设备上切换视图后自动打开侧边栏
    if (!isMd && !isOpen) {
      onToggle();
    }
  }, [isMd, isOpen, onToggle]);

  const sidebarWidth = isMd ? '380px' : '100%';

  return (
    <>
      {/* 移动端遮罩 */}
      {!isMd && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onToggle}
        />
      )}

      {/* 侧边栏 */}
      <div
        className={`
          h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          ${
            isMd
              ? `relative flex-shrink-0 ${isOpen ? '' : 'hidden'}`
              : `fixed top-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
                  isOpen ? 'translate-x-0' : '-translate-x-full'
                }`
          }
        `}
        style={{ width: sidebarWidth }}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <nav className="flex space-x-1">
              <button
                onClick={() => handleViewChange('worldclock')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'worldclock'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4 mr-2" />
                时钟
              </button>
              
              <button
                onClick={() => handleViewChange('timezone-selector')}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'timezone-selector'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                添加
              </button>
            </nav>
          </div>

          {/* 移动端关闭按钮 */}
          {!isMd && (
            <button
              onClick={onToggle}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 侧边栏内容 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {currentView === 'worldclock' && <WorldClock />}
          {currentView === 'timezone-selector' && <TimezoneSelector />}
        </div>
      </div>

      {/* 侧边栏切换按钮（仅在桌面端显示） */}
      {isMd && (
        <button
          onClick={onToggle}
          className={`
            fixed top-1/2 -translate-y-1/2 z-30 bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-600 rounded-r-md shadow-lg
            p-2 transition-all duration-300 hover:shadow-xl
            ${isOpen ? 'left-[380px]' : 'left-0'}
          `}
        >
          {isOpen ? (
            <List className="w-4 h-4 text-gray-600 dark:text-gray-400 rotate-180" />
          ) : (
            <List className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      )}

      {/* 移动端浮动按钮 */}
      {!isMd && !isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-20 left-4 z-30 bg-primary-500 text-white rounded-full p-3 shadow-lg 
                   hover:bg-primary-600 transition-colors duration-200"
        >
          <Globe2 className="w-6 h-6" />
        </button>
      )}
    </>
  );
};