import { Vector3 } from 'three';
import { CityData } from './time';
import { EarthVisualizationSettings, SunPosition } from './geography';

export interface VisualizationState {
  // 3D场景设置
  earthSettings: EarthVisualizationSettings;
  
  // 相机控制
  cameraPosition: Vector3;
  cameraTarget: Vector3;
  
  // 渲染质量
  renderQuality: 'low' | 'medium' | 'high';
  enableShadows: boolean;
  enablePostProcessing: boolean;
  
  // 交互状态
  selectedCity: string | null;
  hoveredCity: string | null;
  isUserInteracting: boolean;
}

export interface Earth3DProps {
  sunPosition: SunPosition;
  cities: CityData[];
  selectedCities: string[];
  onCityClick?: (cityId: string) => void;
  onCityHover?: (cityId: string | null) => void;
  settings: EarthVisualizationSettings;
}

export interface CityMarkerProps {
  city: CityData;
  position: Vector3;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export interface SunlightShaderProps {
  sunPosition: SunPosition;
  time: number;
  intensity: number;
}