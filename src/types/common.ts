export interface AppSettings {
  // 语言设置
  language: 'zh' | 'en';
  
  // 主题设置
  theme: 'light' | 'dark' | 'auto';
  
  // 时间显示设置
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  
  // 可视化设置
  preferredView: '3d' | '2d';
  animationEnabled: boolean;
  
  // 侧栏城市卡片样式
  cardStyle: 'digital' | 'analog';

  // 性能设置
  renderQuality: 'low' | 'medium' | 'high';
  enableShadows: boolean;
}

export interface UserPreferences extends AppSettings {
  customCities: string[];
  lastUsedTimeOffset: number;
}

// 通用事件类型
export type EventHandler<T = void> = (event: T) => void;

// 通用状态更新函数类型
export type StateUpdater<T> = (value: T | ((prev: T) => T)) => void;

// API响应通用类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 加载状态
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  progress?: number;
}