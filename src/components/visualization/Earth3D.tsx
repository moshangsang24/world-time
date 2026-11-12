import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Color } from 'three';
import { useVisualizationStore } from '@store/visualizationStore';
import { EARTH_CONSTANTS, COLORS } from '@data/constants';
import type { SunPosition } from '@/types/geography';

interface Earth3DProps {
  sunPosition: SunPosition;
  onEarthClick?: (position: any) => void;
}

export const Earth3D: React.FC<Earth3DProps> = ({
  onEarthClick,
}) => {
  const meshRef = useRef<Mesh>(null);
  const { earthSettings, renderQuality } = useVisualizationStore();

  // 根据渲染质量确定球体分段数
  const segments = useMemo(() => {
    switch (renderQuality) {
      case 'low': return 16;
      case 'high': return 64;
      default: return 32;
    }
  }, [renderQuality]);

  // 地球自转动画
  useFrame((_state, delta) => {
    if (meshRef.current && earthSettings.enableRotation) {
      meshRef.current.rotation.y += earthSettings.rotationSpeed * delta;
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    if (onEarthClick && event.point) {
      onEarthClick(event.point);
    }
  };

  return (
    <group>
      {/* 主要的地球网格 */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        scale={[EARTH_CONSTANTS.RADIUS_3D, EARTH_CONSTANTS.RADIUS_3D, EARTH_CONSTANTS.RADIUS_3D]}
      >
        <sphereGeometry args={[1, segments, segments]} />
        <meshStandardMaterial
          color={new Color(COLORS.LAND_DAY)}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* 大气层效果 */}
      <mesh
        scale={[EARTH_CONSTANTS.RADIUS_3D + 0.1, EARTH_CONSTANTS.RADIUS_3D + 0.1, EARTH_CONSTANTS.RADIUS_3D + 0.1]}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          transparent={true}
          opacity={0.1}
          color={new Color(COLORS.ATMOSPHERE)}
          side={2} // DoubleSide
        />
      </mesh>
    </group>
  );
};