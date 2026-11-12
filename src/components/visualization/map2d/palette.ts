export interface MapPalette {
  frame: string; // 地图以外的留边
  ocean: string;
  land: string;
  coastline: string;
  border: string;
  graticule: string;
  equator: string;
  nightColor: [number, number, number]; // 夜面颜色 RGB
  nightMaxAlpha: number; // 天文夜（太阳低于 -18°）的不透明度
  terminator: string;
}

export const MAP_PALETTES: Record<'light' | 'dark', MapPalette> = {
  light: {
    frame: '#e2e8f0',
    ocean: '#b9d7ec',
    land: '#ece7d3',
    coastline: 'rgba(71, 85, 105, 0.55)',
    border: 'rgba(71, 85, 105, 0.28)',
    graticule: 'rgba(30, 41, 59, 0.08)',
    equator: 'rgba(30, 41, 59, 0.18)',
    nightColor: [10, 16, 48],
    nightMaxAlpha: 0.62,
    terminator: 'rgba(255, 255, 255, 0.55)',
  },
  dark: {
    frame: '#020617',
    ocean: '#16395c',
    land: '#5b7a63',
    coastline: 'rgba(226, 232, 240, 0.4)',
    border: 'rgba(226, 232, 240, 0.2)',
    graticule: 'rgba(255, 255, 255, 0.07)',
    equator: 'rgba(255, 255, 255, 0.16)',
    nightColor: [2, 6, 23],
    nightMaxAlpha: 0.72,
    terminator: 'rgba(255, 255, 255, 0.4)',
  },
};

// 标注颜色与主题无关：都画在地图上，靠描边保证可读
export const MARKER_COLORS = {
  sun: '#fde047',
  sunGlow: '253, 224, 71',
  cityDay: '#fbbf24',
  cityNight: '#93c5fd',
  cityStroke: '#ffffff',
  base: '#f43f5e',
  labelText: '#ffffff',
  labelHalo: 'rgba(15, 23, 42, 0.85)',
} as const;
