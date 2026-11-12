import { create } from 'zustand';
import { Vector3 } from 'three';
import type { VisualizationState, EarthVisualizationSettings } from '@types/visualization';
import { RENDERING_CONSTANTS, PERFORMANCE_CONFIG } from '@data/constants';

interface VisualizationActions {
  // 地球设置
  setShowCityLabels: (show: boolean) => void;
  setShowCountryBorders: (show: boolean) => void;
  setShowDayNightLine: (show: boolean) => void;
  setEnableRotation: (enabled: boolean) => void;
  setRotationSpeed: (speed: number) => void;
  setCameraDistance: (distance: number) => void;
  setLightIntensity: (intensity: number) => void;
  
  // 相机控制
  setCameraPosition: (position: Vector3) => void;
  setCameraTarget: (target: Vector3) => void;
  resetCamera: () => void;
  
  // 渲染质量
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => void;
  setEnableShadows: (enabled: boolean) => void;
  setEnablePostProcessing: (enabled: boolean) => void;
  
  // 交互状态
  setSelectedCity: (cityId: string | null) => void;
  setHoveredCity: (cityId: string | null) => void;
  setUserInteracting: (interacting: boolean) => void;
  
  // 批量更新
  updateEarthSettings: (settings: Partial<EarthVisualizationSettings>) => void;
  applyQualityPreset: (quality: 'low' | 'medium' | 'high') => void;
}

type VisualizationStore = VisualizationState & VisualizationActions;

const defaultEarthSettings: EarthVisualizationSettings = {
  showCityLabels: true,
  showCountryBorders: false,
  showDayNightLine: true,
  enableRotation: false,
  rotationSpeed: 0.005,
  cameraDistance: RENDERING_CONSTANTS.CAMERA_DISTANCE,
  lightIntensity: 1.0,
};

export const useVisualizationStore = create<VisualizationStore>()((set, get) => ({
  // 初始状态
  earthSettings: defaultEarthSettings,
  cameraPosition: new Vector3(0, 0, RENDERING_CONSTANTS.CAMERA_DISTANCE),
  cameraTarget: new Vector3(0, 0, 0),
  renderQuality: 'medium',
  enableShadows: true,
  enablePostProcessing: false,
  selectedCity: null,
  hoveredCity: null,
  isUserInteracting: false,

  // 地球设置方法
  setShowCityLabels: (show: boolean) => {
    set(state => ({
      earthSettings: { ...state.earthSettings, showCityLabels: show },
    }));
  },

  setShowCountryBorders: (show: boolean) => {
    set(state => ({
      earthSettings: { ...state.earthSettings, showCountryBorders: show },
    }));
  },

  setShowDayNightLine: (show: boolean) => {
    set(state => ({
      earthSettings: { ...state.earthSettings, showDayNightLine: show },
    }));
  },

  setEnableRotation: (enabled: boolean) => {
    set(state => ({
      earthSettings: { ...state.earthSettings, enableRotation: enabled },
    }));
  },

  setRotationSpeed: (speed: number) => {
    const clampedSpeed = Math.max(0.001, Math.min(0.1, speed));
    set(state => ({
      earthSettings: { ...state.earthSettings, rotationSpeed: clampedSpeed },
    }));
  },

  setCameraDistance: (distance: number) => {
    const clampedDistance = Math.max(2.5, Math.min(10, distance));
    set(state => ({
      earthSettings: { ...state.earthSettings, cameraDistance: clampedDistance },
      cameraPosition: new Vector3(0, 0, clampedDistance),
    }));
  },

  setLightIntensity: (intensity: number) => {
    const clampedIntensity = Math.max(0.1, Math.min(2.0, intensity));
    set(state => ({
      earthSettings: { ...state.earthSettings, lightIntensity: clampedIntensity },
    }));
  },

  // 相机控制方法
  setCameraPosition: (position: Vector3) => {
    set({ cameraPosition: position.clone() });
  },

  setCameraTarget: (target: Vector3) => {
    set({ cameraTarget: target.clone() });
  },

  resetCamera: () => {
    const { earthSettings } = get();
    set({
      cameraPosition: new Vector3(0, 0, earthSettings.cameraDistance),
      cameraTarget: new Vector3(0, 0, 0),
    });
  },

  // 渲染质量方法
  setRenderQuality: (quality: 'low' | 'medium' | 'high') => {
    set({ renderQuality: quality });
    get().applyQualityPreset(quality);
  },

  setEnableShadows: (enabled: boolean) => {
    set({ enableShadows: enabled });
  },

  setEnablePostProcessing: (enabled: boolean) => {
    set({ enablePostProcessing: enabled });
  },

  // 交互状态方法
  setSelectedCity: (cityId: string | null) => {
    set({ selectedCity: cityId });
  },

  setHoveredCity: (cityId: string | null) => {
    set({ hoveredCity: cityId });
  },

  setUserInteracting: (interacting: boolean) => {
    set({ isUserInteracting: interacting });
  },

  // 批量更新方法
  updateEarthSettings: (settings: Partial<EarthVisualizationSettings>) => {
    set(state => ({
      earthSettings: { ...state.earthSettings, ...settings },
    }));
  },

  applyQualityPreset: (quality: 'low' | 'medium' | 'high') => {
    const preset = PERFORMANCE_CONFIG[`${quality.toUpperCase()}_QUALITY` as keyof typeof PERFORMANCE_CONFIG];
    
    set({
      enableShadows: preset.enableShadows,
      enablePostProcessing: preset.enablePostProcessing,
    });
  },
}));