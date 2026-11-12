// 时间相关常量
export const TIME_CONSTANTS = {
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  MINUTES_PER_DAY: 1440,
  SECONDS_PER_MINUTE: 60,
  MILLISECONDS_PER_SECOND: 1000,
  MILLISECONDS_PER_MINUTE: 60000,
} as const;

// 地球物理常量
export const EARTH_CONSTANTS = {
  RADIUS: 6371000, // 地球半径（米）
  RADIUS_3D: 2, // 3D场景中地球半径
  TILT: 23.5, // 地球倾斜角度
  ROTATION_PERIOD: 86400, // 地球自转周期（秒）
  ORBIT_PERIOD: 31557600, // 地球公转周期（秒）
} as const;

// 天文计算常量
export const ASTRONOMICAL_CONSTANTS = {
  JULIAN_DAY_J2000: 2451545.0, // J2000.0的儒略日
  DEGREES_TO_RADIANS: Math.PI / 180,
  RADIANS_TO_DEGREES: 180 / Math.PI,
  SOLAR_CONSTANT: 1361, // 太阳常数 W/m²
  ATMOSPHERIC_REFRACTION: 0.833, // 大气折射角度
} as const;

// 3D渲染常量
export const RENDERING_CONSTANTS = {
  CAMERA_DISTANCE: 5,
  CAMERA_FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  EARTH_SEGMENTS: 64,
  CITY_MARKER_SIZE: 0.02,
  ANIMATION_DURATION: 1000,
} as const;

// UI常量
export const UI_CONSTANTS = {
  SCROLL_SENSITIVITY: 1, // 滚动灵敏度（分钟）
  SCROLL_SENSITIVITY_FINE: 0.1, // 精细控制灵敏度
  UPDATE_INTERVAL: 1000, // 实时模式更新间隔（毫秒）
  ANIMATION_DURATION: 300, // UI动画时长（毫秒）
  DEBOUNCE_DELAY: 100, // 防抖延迟（毫秒）
} as const;

// 颜色常量
export const COLORS = {
  SUN_LIGHT: '#ffd700',
  EARTH_DAY: '#4a90e2',
  EARTH_NIGHT: '#1a1a2e',
  OCEAN: '#006994',
  LAND_DAY: '#8fbc8f',
  LAND_NIGHT: '#2f4f2f',
  CITY_MARKER: '#ff6b6b',
  CITY_MARKER_SELECTED: '#ffd93d',
  ATMOSPHERE: '#87ceeb',
} as const;

// 应用配置
export const APP_CONFIG = {
  NAME: '世界时间可视化',
  VERSION: '1.0.0',
  DESCRIPTION: '世界时间可视化网页应用',
  AUTHOR: 'World Time Team',
  DEFAULT_LANGUAGE: 'zh' as const,
  DEFAULT_THEME: 'auto' as const,
  DEFAULT_TIME_FORMAT: '24h' as const,
} as const;

// 性能配置
export const PERFORMANCE_CONFIG = {
  LOW_QUALITY: {
    earthSegments: 32,
    enableShadows: false,
    enablePostProcessing: false,
    cityLabelDistance: 3,
  },
  MEDIUM_QUALITY: {
    earthSegments: 64,
    enableShadows: true,
    enablePostProcessing: false,
    cityLabelDistance: 4,
  },
  HIGH_QUALITY: {
    earthSegments: 128,
    enableShadows: true,
    enablePostProcessing: true,
    cityLabelDistance: 5,
  },
} as const;