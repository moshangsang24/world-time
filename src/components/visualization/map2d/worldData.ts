import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import type { Position } from 'geojson';
import countriesTopology from 'world-atlas/countries-110m.json';

// 数据来源：Natural Earth 1:110m（world-atlas 包，TopoJSON）。
// 坐标为 [经度, 纬度]，多边形已在 ±180° 处切开。

const topology = countriesTopology as unknown as Topology<{
  land: GeometryCollection;
  countries: GeometryCollection;
}>;

const collectLandRings = (): Position[][] => {
  const land = feature(topology, topology.objects.land);
  const rings: Position[][] = [];

  for (const { geometry } of land.features) {
    if (geometry.type === 'Polygon') {
      rings.push(...geometry.coordinates);
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates) {
        rings.push(...polygon);
      }
    }
  }

  return rings;
};

/** 陆地多边形的所有环（外环和内环混在一起，填充时用 evenodd） */
export const LAND_RINGS: Position[][] = collectLandRings();

/** 国与国之间的边界线（不含海岸线） */
export const BORDER_LINES: Position[][] = mesh(
  topology,
  topology.objects.countries,
  (a, b) => a !== b
).coordinates;
