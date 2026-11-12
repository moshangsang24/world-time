import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, UserPreferences } from '@/types/common';
import { APP_CONFIG } from '@data/constants';

interface SettingsActions {
  // 语言设置
  setLanguage: (language: 'zh' | 'en') => void;
  
  // 主题设置
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  
  // 时间显示设置
  setTimeFormat: (format: '12h' | '24h') => void;
  setShowSeconds: (show: boolean) => void;
  
  // 可视化设置
  setPreferredView: (view: '3d' | '2d') => void;
  setAnimationEnabled: (enabled: boolean) => void;
  
  // 性能设置
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => void;
  setEnableShadows: (enabled: boolean) => void;
  
  // 用户偏好
  setSelectedCities: (cityIds: string[]) => void;
  setCustomCities: (cityIds: string[]) => void;
  setLastUsedTimeOffset: (offset: number) => void;
  
  // 重置设置
  resetToDefaults: () => void;
}

type SettingsStore = UserPreferences & SettingsActions;

const defaultSettings: AppSettings = {
  language: APP_CONFIG.DEFAULT_LANGUAGE,
  theme: APP_CONFIG.DEFAULT_THEME,
  timeFormat: APP_CONFIG.DEFAULT_TIME_FORMAT,
  showSeconds: true,
  preferredView: '3d',
  animationEnabled: true,
  renderQuality: 'medium',
  enableShadows: true,
};

const defaultUserPreferences: UserPreferences = {
  ...defaultSettings,
  selectedCities: ['beijing', 'tokyo', 'london', 'new-york'],
  customCities: [],
  lastUsedTimeOffset: 0,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      ...defaultUserPreferences,

      // 语言设置
      setLanguage: (language: 'zh' | 'en') => {
        set({ language });
        // 可以在这里添加语言切换的副作用
        document.documentElement.lang = language;
      },

      // 主题设置
      setTheme: (theme: 'light' | 'dark' | 'auto') => {
        set({ theme });
        
        // 应用主题到DOM
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        
        if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          root.classList.add(prefersDark ? 'dark' : 'light');
        } else {
          root.classList.add(theme);
        }
      },

      // 时间显示设置
      setTimeFormat: (format: '12h' | '24h') => {
        set({ timeFormat: format });
      },

      setShowSeconds: (show: boolean) => {
        set({ showSeconds: show });
      },

      // 可视化设置
      setPreferredView: (view: '3d' | '2d') => {
        set({ preferredView: view });
      },

      setAnimationEnabled: (enabled: boolean) => {
        set({ animationEnabled: enabled });
      },

      // 性能设置
      setRenderQuality: (quality: 'low' | 'medium' | 'high') => {
        set({ renderQuality: quality });
      },

      setEnableShadows: (enabled: boolean) => {
        set({ enableShadows: enabled });
      },

      // 用户偏好
      setSelectedCities: (cityIds: string[]) => {
        set({ selectedCities: cityIds });
      },

      setCustomCities: (cityIds: string[]) => {
        set({ customCities: cityIds });
      },

      setLastUsedTimeOffset: (offset: number) => {
        set({ lastUsedTimeOffset: offset });
      },

      // 重置设置
      resetToDefaults: () => {
        set(defaultUserPreferences);
        
        // 重新应用主题
        get().setTheme(defaultUserPreferences.theme);
        get().setLanguage(defaultUserPreferences.language);
      },
    }),
    {
      name: 'world-time-settings',
      version: 1,
      
      // 迁移函数（版本升级时使用）
      migrate: (persistedState: any, version: number) => {
        if (version < 1) {
          // 从v0升级到v1的迁移逻辑
          return {
            ...defaultUserPreferences,
            ...persistedState,
          };
        }
        return persistedState;
      },
    }
  )
);

// 初始化时应用保存的设置
const initializeSettings = () => {
  const settings = useSettingsStore.getState();
  settings.setTheme(settings.theme);
  settings.setLanguage(settings.language);
};

// 监听系统主题变化
const handleSystemThemeChange = (e: MediaQueryListEvent) => {
  const settings = useSettingsStore.getState();
  if (settings.theme === 'auto') {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(e.matches ? 'dark' : 'light');
  }
};

// 设置系统主题监听器
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);
  
  // 页面加载时初始化设置
  initializeSettings();
}