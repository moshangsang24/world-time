// 等距圆柱投影：经度线性映射到 x，纬度线性映射到 y。
// 这是 2D 地图唯一的一份经纬度 ↔ 画布坐标转换，绘制和点击命中都用它。

/** 地图在画布中实际占据的矩形（CSS 像素），宽高比固定 2:1 */
export interface MapViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

/** 在容器内放一个尽量大的 2:1 矩形并居中，多出的部分留边，地图不拉伸 */
export const fitViewport = (
  containerWidth: number,
  containerHeight: number
): MapViewport => {
  const width = Math.min(containerWidth, containerHeight * 2);
  const height = width / 2;

  return {
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
    width,
    height,
  };
};

/** 经纬度（度）→ 画布坐标 */
export const project = (
  latitude: number,
  longitude: number,
  viewport: MapViewport
): MapPoint => ({
  x: viewport.x + ((longitude + 180) / 360) * viewport.width,
  y: viewport.y + ((90 - latitude) / 180) * viewport.height,
});
