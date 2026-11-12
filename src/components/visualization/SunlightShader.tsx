import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, ShaderMaterial, Color, Vector3 } from 'three';
import { EARTH_CONSTANTS, COLORS } from '@data/constants';
import type { SunPosition } from '@types/geography';

interface SunlightShaderProps {
  sunPosition: SunPosition;
  intensity?: number;
}

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 sunDirection;
  uniform float sunIntensity;
  uniform vec3 dayColor;
  uniform vec3 nightColor;
  uniform vec3 sunColor;
  uniform float atmosphereThickness;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    // 计算表面法向量
    vec3 normal = normalize(vNormal);
    
    // 计算太阳光照强度
    float sunDot = dot(normal, sunDirection);
    float sunIntensity_calc = max(sunDot, 0.0);
    
    // 计算昼夜过渡
    float dayNightTransition = smoothstep(-0.1, 0.1, sunDot);
    
    // 混合昼夜颜色
    vec3 surfaceColor = mix(nightColor, dayColor, dayNightTransition);
    
    // 添加太阳光照高光
    if (sunDot > 0.8) {
      float sunHighlight = pow(sunDot, 32.0);
      surfaceColor = mix(surfaceColor, sunColor, sunHighlight * 0.3);
    }
    
    // 大气散射效果
    float atmosphere = 1.0 - abs(dot(normal, vec3(0.0, 0.0, 1.0)));
    atmosphere = pow(atmosphere, atmosphereThickness);
    
    // 最终颜色
    vec3 finalColor = surfaceColor;
    finalColor = mix(finalColor, vec3(0.3, 0.6, 1.0), atmosphere * 0.1);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const SunlightShader: React.FC<SunlightShaderProps> = ({
  sunPosition,
  intensity = 1.0,
}) => {
  const meshRef = useRef<Mesh>(null);

  // 计算太阳方向向量
  const sunDirection = useMemo(() => {
    const { longitude, declination } = sunPosition;
    const phi = (90 - declination) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);
    
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.cos(phi);
    const z = Math.sin(phi) * Math.sin(theta);
    
    return new Vector3(x, y, z).normalize();
  }, [sunPosition]);

  // 着色器材质
  const shaderMaterial = useMemo(() => {
    return new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        sunDirection: { value: sunDirection },
        sunIntensity: { value: intensity },
        dayColor: { value: new Color(COLORS.LAND_DAY) },
        nightColor: { value: new Color(COLORS.LAND_NIGHT) },
        sunColor: { value: new Color(COLORS.SUN_LIGHT) },
        atmosphereThickness: { value: 2.0 },
      },
      transparent: true,
    });
  }, [sunDirection, intensity]);

  // 更新着色器参数
  useFrame(() => {
    if (shaderMaterial) {
      shaderMaterial.uniforms.sunDirection.value.copy(sunDirection);
      shaderMaterial.uniforms.sunIntensity.value = intensity;
    }
  });

  return (
    <mesh
      ref={meshRef}
      scale={[
        EARTH_CONSTANTS.RADIUS_3D + 0.005,
        EARTH_CONSTANTS.RADIUS_3D + 0.005,
        EARTH_CONSTANTS.RADIUS_3D + 0.005,
      ]}
    >
      <sphereGeometry args={[1, 64, 64]} />
      <primitive object={shaderMaterial} attach="material" />
    </mesh>
  );
};

// 昼夜分界线组件
interface DayNightLineProps {
  sunPosition: SunPosition;
  color?: string;
  opacity?: number;
}

export const DayNightLine: React.FC<DayNightLineProps> = ({
  sunPosition,
  color = '#ffff00',
  opacity = 0.8,
}) => {
  const lineRef = useRef<any>(null);

  // 计算昼夜分界线上的点
  const boundaryPoints = useMemo(() => {
    const points: Vector3[] = [];
    const { declination, longitude } = sunPosition;
    
    // 计算昼夜分界线
    for (let lng = -180; lng <= 180; lng += 5) {
      const hourAngle = lng - longitude;
      
      // 简化的昼夜分界计算
      const lat = Math.atan2(
        -Math.cos(hourAngle * Math.PI / 180),
        Math.tan(declination * Math.PI / 180)
      ) * 180 / Math.PI;
      
      if (!isNaN(lat) && Math.abs(lat) <= 90) {
        const point = CoordinateUtils.latLngToVector3(lat, lng, EARTH_CONSTANTS.RADIUS_3D + 0.02);
        points.push(point);
      }
    }
    
    return points;
  }, [sunPosition]);

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={new Float32Array(boundaryPoints.flatMap(p => [p.x, p.y, p.z]))}
          count={boundaryPoints.length}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color={color}
        transparent={true}
        opacity={opacity}
        linewidth={2}
      />
    </line>
  );
};

// 为了避免循环导入，这里内联CoordinateUtils的相关函数
const CoordinateUtils = {
  latLngToVector3(latitude: number, longitude: number, radius: number): Vector3 {
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);
    
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    
    return new Vector3(x, y, z);
  }
};