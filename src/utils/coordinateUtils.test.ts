import { describe, expect, it } from 'vitest';
import { CoordinateUtils } from './coordinateUtils';

describe('CoordinateUtils 经纬度与 3D 坐标互转', () => {
  const samples = [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 20 },
    { latitude: 0, longitude: 90 },
    { latitude: 39.9042, longitude: 116.4074 }, // 北京
    { latitude: 34.0522, longitude: -118.2437 }, // 洛杉矶
    { latitude: -33.8688, longitude: 151.2093 }, // 悉尼
    { latitude: -23.5505, longitude: -46.6333 }, // 圣保罗
  ];

  it.each(samples)('($latitude, $longitude) 往返后不变', sample => {
    const vector = CoordinateUtils.latLngToVector3(
      sample.latitude,
      sample.longitude
    );
    const result = CoordinateUtils.vector3ToLatLng(vector);

    expect(result.latitude).toBeCloseTo(sample.latitude, 6);
    expect(result.longitude).toBeCloseTo(sample.longitude, 6);
  });

  it('北极在 +Y，lng=0 在 +X，lng=90 在 -Z', () => {
    const north = CoordinateUtils.latLngToVector3(90, 0, 1);
    const prime = CoordinateUtils.latLngToVector3(0, 0, 1);
    const east = CoordinateUtils.latLngToVector3(0, 90, 1);

    expect(north.y).toBeCloseTo(1, 6);
    expect(prime.x).toBeCloseTo(1, 6);
    expect(east.z).toBeCloseTo(-1, 6);
  });
});
