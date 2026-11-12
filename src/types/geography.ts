export interface Coordinates {
  latitude: number;
  longitude: number;
}

// 所有角度单位为度；经度东正西负
export interface SunPosition {
  declination: number; // 太阳赤纬 = 直射点纬度
  longitude: number; // 直射点经度，[-180, 180)
  rightAscension: number; // 赤经，[0, 360)
  equationOfTime: number; // 均时差（分钟）
}

export interface DayNightBoundary {
  points: Array<{ lat: number; lng: number }>;
  sunLongitude: number;
  isDaylight: (lat: number, lng: number) => boolean;
}

export interface SunlightData {
  sunPosition: SunPosition;
  dayNightBoundary: DayNightBoundary;
  sunriseTime: Date;
  sunsetTime: Date;
  solarNoon: Date;
}

export interface EarthVisualizationSettings {
  showCityLabels: boolean;
  showCountryBorders: boolean;
  showDayNightLine: boolean;
  enableRotation: boolean;
  rotationSpeed: number;
  cameraDistance: number;
  lightIntensity: number;
}