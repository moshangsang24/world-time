import { Vector3 } from 'three';
import { EARTH_CONSTANTS, ASTRONOMICAL_CONSTANTS } from '@data/constants';
import type { Coordinates } from '@/types/geography';

/**
 * 坐标转换工具函数
 */
export class CoordinateUtils {
  /**
   * 将经纬度转换为Three.js的3D坐标
   */
  static latLngToVector3(
    latitude: number,
    longitude: number,
    radius: number = EARTH_CONSTANTS.RADIUS_3D,
    offset = 0
  ): Vector3 {
    const phi = (90 - latitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const theta = (longitude + 180) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    
    const actualRadius = radius + offset;
    
    const x = -(actualRadius * Math.sin(phi) * Math.cos(theta));
    const z = actualRadius * Math.sin(phi) * Math.sin(theta);
    const y = actualRadius * Math.cos(phi);
    
    return new Vector3(x, y, z);
  }

  /**
   * 将Three.js的3D坐标转换为经纬度
   */
  static vector3ToLatLng(vector: Vector3): Coordinates {
    const { x, y, z } = vector;
    const r = Math.sqrt(x * x + y * y + z * z);
    
    const latitude = 90 - Math.acos(y / r) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES;
    // atan2 得到 θ = lng + 180，归一化回 [-180, 180)
    const longitude = ((Math.atan2(z, -x) * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES + 360) % 360) - 180;
    
    return {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude,
    };
  }

  /**
   * 计算球面上两点间的弧长距离
   */
  static sphericalDistance(
    coord1: Coordinates,
    coord2: Coordinates,
    radius: number = EARTH_CONSTANTS.RADIUS_3D
  ): number {
    const lat1Rad = coord1.latitude * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const lat2Rad = coord2.latitude * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const deltaLat = (coord2.latitude - coord1.latitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
    const deltaLng = (coord2.longitude - coord1.longitude) * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;

    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return radius * c;
  }

  /**
   * 将屏幕坐标转换为球面坐标
   */
  static screenToSphere(
    screenX: number,
    screenY: number,
    screenWidth: number,
    screenHeight: number,
    radius: number = EARTH_CONSTANTS.RADIUS_3D
  ): Vector3 | null {
    // 将屏幕坐标标准化到[-1, 1]范围
    const x = (screenX / screenWidth) * 2 - 1;
    const y = -(screenY / screenHeight) * 2 + 1;
    
    // 检查是否在球的投影范围内
    const distanceFromCenter = Math.sqrt(x * x + y * y);
    if (distanceFromCenter > 1) return null;
    
    // 计算球面上的z坐标
    const z = Math.sqrt(1 - distanceFromCenter * distanceFromCenter);
    
    return new Vector3(x * radius, y * radius, z * radius);
  }

  /**
   * 计算从一点看向另一点的方向向量
   */
  static getDirectionVector(from: Vector3, to: Vector3): Vector3 {
    return to.clone().sub(from).normalize();
  }

  /**
   * 插值计算两个坐标之间的中间位置
   */
  static interpolateCoordinates(
    coord1: Coordinates,
    coord2: Coordinates,
    t: number
  ): Coordinates {
    const clampedT = Math.max(0, Math.min(1, t));
    
    return {
      latitude: coord1.latitude + (coord2.latitude - coord1.latitude) * clampedT,
      longitude: coord1.longitude + (coord2.longitude - coord1.longitude) * clampedT,
    };
  }

  /**
   * 计算球面上的切线向量
   */
  static getTangentVectors(position: Vector3): { tangent1: Vector3; tangent2: Vector3 } {
    const normal = position.clone().normalize();
    
    // 创建一个不平行于法线的向量
    const reference = Math.abs(normal.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
    
    const tangent1 = new Vector3().crossVectors(normal, reference).normalize();
    const tangent2 = new Vector3().crossVectors(normal, tangent1).normalize();
    
    return { tangent1, tangent2 };
  }
}

/**
 * 数学工具函数
 */
export class MathUtils {
  /**
   * 角度转弧度
   */
  static degToRad(degrees: number): number {
    return degrees * ASTRONOMICAL_CONSTANTS.DEGREES_TO_RADIANS;
  }

  /**
   * 弧度转角度
   */
  static radToDeg(radians: number): number {
    return radians * ASTRONOMICAL_CONSTANTS.RADIANS_TO_DEGREES;
  }

  /**
   * 钳制数值在指定范围内
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * 线性插值
   */
  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * this.clamp(t, 0, 1);
  }

  /**
   * 平滑步长函数
   */
  static smoothstep(min: number, max: number, value: number): number {
    const t = this.clamp((value - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /**
   * 标准化角度到[-180, 180]范围
   */
  static normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  /**
   * 计算两个角度之间的最短差值
   */
  static angleDifference(angle1: number, angle2: number): number {
    const diff = angle2 - angle1;
    return this.normalizeAngle(diff);
  }

  /**
   * 将数值映射到新的范围
   */
  static mapRange(
    value: number,
    fromMin: number,
    fromMax: number,
    toMin: number,
    toMax: number
  ): number {
    const t = (value - fromMin) / (fromMax - fromMin);
    return toMin + t * (toMax - toMin);
  }

  /**
   * 生成指定范围内的随机数
   */
  static randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * 检查数值是否在容差范围内相等
   */
  static approximately(a: number, b: number, tolerance = 1e-6): boolean {
    return Math.abs(a - b) <= tolerance;
  }
}

/**
 * 防抖和节流工具
 */
export class PerformanceUtils {
  /**
   * 防抖函数
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T {
    let timeout: ReturnType<typeof setTimeout>;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    }) as T;
  }

  /**
   * 节流函数
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    
    return ((...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }

  /**
   * 使用requestAnimationFrame的节流
   */
  static rafThrottle<T extends (...args: any[]) => any>(func: T): T {
    let rafId: number | null = null;
    
    return ((...args: Parameters<T>) => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          func(...args);
          rafId = null;
        });
      }
    }) as T;
  }

  /**
   * 延迟执行
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 颜色工具函数
 */
export class ColorUtils {
  /**
   * 将HSL转换为RGB
   */
  static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h /= 360;
    s /= 100;
    l /= 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    if (s === 0) {
      return { r: l, g: l, b: l };
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      
      return {
        r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
        g: Math.round(hue2rgb(p, q, h) * 255),
        b: Math.round(hue2rgb(p, q, h - 1/3) * 255)
      };
    }
  }

  /**
   * 将RGB转换为十六进制字符串
   */
  static rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /**
   * 颜色插值
   */
  static lerpColor(color1: string, color2: string, t: number): string {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substr(0, 2), 16);
    const g1 = parseInt(hex1.substr(2, 2), 16);
    const b1 = parseInt(hex1.substr(4, 2), 16);
    
    const r2 = parseInt(hex2.substr(0, 2), 16);
    const g2 = parseInt(hex2.substr(2, 2), 16);
    const b2 = parseInt(hex2.substr(4, 2), 16);
    
    const r = Math.round(MathUtils.lerp(r1, r2, t));
    const g = Math.round(MathUtils.lerp(g1, g2, t));
    const b = Math.round(MathUtils.lerp(b1, b2, t));
    
    return this.rgbToHex(r, g, b);
  }
}