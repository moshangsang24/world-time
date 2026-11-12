import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { Mesh, Vector3, Color } from 'three';
import { EARTH_CONSTANTS, COLORS } from '@data/constants';
import { I18nFormatters } from '@utils/formatters';
import { useSettingsStore } from '@store/settingsStore';
import type { CityTimeData } from '@types/time';

// 简化的坐标转换函数
const latLngToVector3 = (latitude: number, longitude: number, radius: number, offset = 0) => {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);
  
  const actualRadius = radius + offset;
  
  const x = -(actualRadius * Math.sin(phi) * Math.cos(theta));
  const z = actualRadius * Math.sin(phi) * Math.sin(theta);
  const y = actualRadius * Math.cos(phi);
  
  return new Vector3(x, y, z);
};

interface CityMarkerProps {
  city: CityTimeData;
  isSelected: boolean;
  isHovered: boolean;
  onClick?: () => void;
  onHover?: (hovered: boolean) => void;
}

export const CityMarker: React.FC<CityMarkerProps> = ({
  city,
  isSelected,
  isHovered,
  onClick,
  onHover,
}) => {
  const markerRef = useRef<Mesh>(null);
  const textRef = useRef<any>(null);
  const { language } = useSettingsStore();

  // 计算城市在球面上的位置
  const position = useMemo(() => {
    return latLngToVector3(
      city.latitude,
      city.longitude,
      EARTH_CONSTANTS.RADIUS_3D,
      0.02 // 稍微突出地球表面
    );
  }, [city.latitude, city.longitude]);

  // 计算文字标签位置（距离地球更远一点）
  const labelPosition = useMemo(() => {
    return latLngToVector3(
      city.latitude,
      city.longitude,
      EARTH_CONSTANTS.RADIUS_3D,
      0.3 // 文字距离地球更远
    );
  }, [city.latitude, city.longitude]);

  // 计算标记颜色
  const markerColor = useMemo(() => {
    if (isSelected) return new Color(COLORS.CITY_MARKER_SELECTED);
    if (city.isDaytime) return new Color(COLORS.SUN_LIGHT);
    return new Color(COLORS.CITY_MARKER);
  }, [isSelected, city.isDaytime]);

  // 脉冲动画
  useFrame((state) => {
    if (markerRef.current && (isSelected || isHovered)) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.2;
      markerRef.current.scale.setScalar(scale);
    } else if (markerRef.current) {
      markerRef.current.scale.setScalar(1);
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    onClick?.();
  };

  const handlePointerEnter = () => {
    onHover?.(true);
  };

  const handlePointerLeave = () => {
    onHover?.(false);
  };

  const cityName = I18nFormatters.getCityName(city, language);

  return (
    <group>
      {/* 城市标记点 */}
      <mesh
        ref={markerRef}
        position={position}
        onClick={handleClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial
          color={markerColor}
          transparent={true}
          opacity={isHovered ? 1 : 0.8}
        />
      </mesh>

      {/* 发光效果（为选中或悬停的城市） */}
      {(isSelected || isHovered) && (
        <mesh position={position}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial
            color={markerColor}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      )}

      {/* 城市名称标签 */}
      {(isSelected || isHovered) && (
        <Text
          ref={textRef}
          position={labelPosition}
          fontSize={0.08}
          color={city.isDaytime ? COLORS.SUN_LIGHT : '#ffffff'}
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {cityName}
        </Text>
      )}

      {/* 时间信息标签（仅在选中时显示） */}
      {isSelected && (
        <Text
          position={[labelPosition.x, labelPosition.y - 0.15, labelPosition.z]}
          fontSize={0.06}
          color={city.isDaytime ? COLORS.SUN_LIGHT : '#cccccc'}
          anchorX="center"
          anchorY="middle"
        >
          {city.timeString}
        </Text>
      )}

      {/* 连接线（从地心到标记点） */}
      {isSelected && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([
                0, 0, 0, // 地心
                position.x, position.y, position.z, // 标记点
              ])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={markerColor}
            transparent={true}
            opacity={0.5}
          />
        </line>
      )}
    </group>
  );
};

interface CityMarkersProps {
  cities: CityTimeData[];
  selectedCity: string | null;
  hoveredCity: string | null;
  onCityClick?: (cityId: string) => void;
  onCityHover?: (cityId: string | null) => void;
}

export const CityMarkers: React.FC<CityMarkersProps> = ({
  cities,
  selectedCity,
  hoveredCity,
  onCityClick,
  onCityHover,
}) => {
  return (
    <group>
      {cities.map((city) => (
        <CityMarker
          key={city.id}
          city={city}
          isSelected={selectedCity === city.id}
          isHovered={hoveredCity === city.id}
          onClick={() => onCityClick?.(city.id)}
          onHover={(hovered) => onCityHover?.(hovered ? city.id : null)}
        />
      ))}
    </group>
  );
};