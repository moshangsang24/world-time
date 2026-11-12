export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface SunPosition {
  declination: number; // 太阳赤纬角
  hourAngle: number; // 时角
  azimuth: number; // 方位角
  altitude: number; // 高度角
  longitude: number; // 太阳经度
  rightAscension: number; // 赤经
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