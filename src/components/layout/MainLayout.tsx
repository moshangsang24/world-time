import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { TimeSlider } from '@components/time/TimeSlider';
import { useBreakpoint } from '@hooks/useWindowSize';

interface MainLayoutProps {
  children: React.ReactNode;
  showTimeSlider?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showTimeSlider = true,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const { isMd } = useBreakpoint();

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleInfoClick = () => {
    setShowInfo(true);
  };

  // 在移动设备上默认关闭侧边栏
  React.useEffect(() => {
    if (!isMd) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMd]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* 顶部导航栏 */}
      <Header 
        onSettingsClick={handleSettingsClick}
        onInfoClick={handleInfoClick}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar 
          isOpen={sidebarOpen}
          onToggle={handleSidebarToggle}
        />

        {/* 主要内容区域 */}
        <main 
          className={`
            flex-1 flex flex-col overflow-hidden
            ${isMd && sidebarOpen ? 'ml-0' : ''}
            transition-all duration-300 ease-in-out
          `}
        >
          {/* 3D可视化区域 */}
          <div className="flex-1 relative">
            {children}
          </div>

          {/* 时间控制滑块 */}
          {showTimeSlider && (
            <div className="flex-shrink-0">
              <TimeSlider />
            </div>
          )}
        </main>
      </div>

      {/* 设置对话框 */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                设置
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                         dark:hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              设置面板开发中...
            </div>
          </div>
        </div>
      )}

      {/* 帮助信息对话框 */}
      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                使用帮助
              </h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 
                         dark:hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">鼠标控制</h4>
                <ul className="space-y-1 list-disc list-inside ml-4">
                  <li>拖拽地球进行旋转</li>
                  <li>滚轮缩放视图</li>
                  <li>滚轮控制时间变化</li>
                  <li>点击城市查看详细信息</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">键盘快捷键</h4>
                <ul className="space-y-1 list-disc list-inside ml-4">
                  <li>← / →：时间后退 / 前进 1 分钟</li>
                  <li>空格键：暂停 / 恢复实时</li>
                  <li>Home键：回到当前时间并恢复实时</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">时间控制</h4>
                <ul className="space-y-1 list-disc list-inside ml-4">
                  <li>实时模式：显示当前真实时间</li>
                  <li>暂停后：以暂停那一刻为起点，可查看前后24小时</li>
                  <li>滚动或拖拽滑块改变时间</li>
                  <li>点击快捷按钮快速跳转</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};