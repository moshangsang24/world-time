# 世界时间网页（world-time）

## 项目目标

用网页可视化全世界的时间与太阳光照：以洛杉矶时间（`America/Los_Angeles`）为基准，通过滚轮前后滚动 ±24 小时，观察各时区时间与昼夜的变化。基准时区集中定义在 `src/data/constants.ts` 的 `BASE_ZONE`，不要在别处硬编码时区名或“洛杉矶时间”文案。

需求与技术方案见 `docs/项目需求文档.md`、`docs/技术方案文档.md`，当前的修复计划见 `docs/修复方案.md`。**这两份文档描述的是目标态，大量功能尚未实现，不能当作现状依据**（差异见文末）。

## 常用命令

```bash
npm run dev         # http://localhost:3000（vite 配置了 open:true）
npm run type-check  # tsc --noEmit
npm run build       # = tsc && vite build
npm run lint        # 0 error；还有 16 个 warning（no-explicit-any 为主）
npm test            # vitest run，测试文件为 src/**/*.test.{ts,tsx}
```

- Node 18+（Vite 5 要求）。
- 提交前四条命令都要通过；涉及界面的改动另外在 dev 页面确认。
- vitest 配置写在 `vite.config.ts` 的 `test` 字段里（环境 happy-dom，复用同一套别名）。

## 技术栈

React 18 + TypeScript + Vite 5 + Zustand 4 + Luxon + Tailwind CSS 3。
`three` / `@react-three/fiber` / `@react-three/drei` 已安装，但 3D 组件当前没有被挂载。

## 架构（以实际挂载为准）

```
main.tsx → App → MainLayout
                    ├─ Header（主题切换、基准时间、实时/偏移状态）
                    ├─ Sidebar → WorldClock → CityTimeCard
                    │            TimezoneSelector
                    ├─ EarthVisualization → WorldMap2D   ← 唯一实际渲染的视图
                    └─ TimeSlider
```

- **`WorldMap2D`**：单个 `<canvas>` + 等距圆柱投影，地图固定 2:1、在容器内居中留边。绘制逻辑拆在 `components/visualization/map2d/`：
  - `projection.ts`：经纬度 → 画布坐标，**2D 唯一一份**，绘制和点击命中都用它。
  - `worldData.ts`：Natural Earth 1:110m 陆地和国界（`world-atlas` + `topojson-client`）。
  - `drawBaseMap.ts`：海洋、陆地、国界、经纬网。结果缓存在离屏 canvas，只在尺寸或主题变化时重画。跨 ±180° 的多边形用 `traceRing` 展开后平移补画，不要用断开折线的方式画闭合环。
  - `drawNightShade.ts`：按 1° 网格逐格算太阳高度角着色（含曙暮光渐变），再平滑放大。
  - `drawOverlay.ts`：晨昏线、太阳直射点、底部地方平时刻度、城市点与防重叠标签。
  - `palette.ts`：浅色 / 深色两套底图配色。
- **`Earth3D` / `SunlightShader` / `CityMarkers`**：完整 3D 实现，但只被 `components/visualization/index.ts` 导出，应用里没有 `<Canvas>`，**从未渲染**。README 说的“3D 地球”是目标态。
- 没有 2D/3D 切换；`settingsStore.preferredView` 没有任何消费者。

```
src/components/{common,layout,time,visualization}
src/hooks/  src/store/  src/utils/  src/data/  src/types/
```

各目录有 `index.ts` barrel，但业务代码基本不用；`src/styles/` 为空，全局样式只在 `src/index.css`。

## 状态管理与数据流

三份 Zustand store，互不直接调用，跨 store 的聚合放在 hooks 里。

1. **`timeStore`（核心，不持久化）**
   - `baseTime: DateTime`（Luxon，`BASE_ZONE.timezone`）是**唯一时间事实来源**。
   - `timeOffset: number`，单位**分钟**，范围 ±1440。
   - `cities` 是由 `selectedCities` 派生出的 `CityTimeData[]`。
   - `anchorTime`：离开实时模式那一刻冻结的时刻，`baseTime = anchorTime + timeOffset`；实时模式下为 `null`。
   - 模块加载时自动启动 1s interval（实时模式）并初始化城市，不是 React effect；HMR 时通过 `import.meta.hot.dispose` 清理。
2. **`settingsStore`（persist 到 `world-time-settings`）**：主题（唯一真正可用的设置 UI）、语言、时间格式等。
3. **`visualizationStore`**：主要服务未启用的 3D。实际只消费 `selectedCity`。

Hooks 分工：

- `useTimeState`：时间展示，按用户设置重新格式化 `cities` 的时间字符串。
- `useSunPosition`：由 `baseTime` 计算太阳位置、晨昏线、日出日落。
- `useScrollControl`：document 级 wheel / keydown。
- `useWindowSize` / `useBreakpoint`：响应式（768px 断点）。

**滚轮链路**：`document wheel` → `useScrollControl`（`preventDefault`；只取 `deltaY` 符号，每个事件 **1 分钟**；用 `useTimeStore.getState()` 读最新偏移）→ `timeStore.setTimeOffset`（退出实时、冻结锚点、clamp ±1440）→ `updateCityTimes()` 对每个城市 `setZone(city.timezone)` → 组件重渲染 + `WorldMap2D` 重绘（贴缓存底图 → 夜面 → 标注）。

**键盘**：`←/→` ±1 分钟、`Space` 暂停 / 恢复实时、`Home` 回到当前时间并恢复实时。

## 时间与天文约定（最容易踩坑）

- 一切时间运算用 Luxon `DateTime`；跨时区显示用 `baseTime.setZone(city.timezone).toFormat(...)`。时区缩写（PST/PDT）用 `TimeFormatter.formatZoneAbbr`。
- **不要** `toJSDate()` + `Intl.DateTimeFormat` 且不传 `timeZone`——会按运行环境时区格式化（`utils/formatters.ts` 里有这种写法，跨日会显示错星期）。
- 偏移是**经过的分钟数**（对绝对时刻加减），不是墙上时钟的分钟数；洛杉矶有夏令时，不要改成按本地时间字段加减。
- `CityData.utcOffset` 单位是**小时**，是标准时、**不随夏令时变化**；当前真实偏移用 `setZone(...).offset / 60` 或 `toFormat('ZZ')`。排序/分组仍在用静态值，DST 期间会偏差一小时。
- 太阳位置来自 `utils/sunCalculations.ts` 的 NOAA 算法（`SunPositionCalculator`），测试里用 `suncalc` 做对照。`SunPosition.declination` / `longitude` 就是直射点的纬度 / 经度，单位是**度**；`suncalc` 返回的是**弧度**。
- 某地太阳高度角用 `SunPositionCalculator.altitudeAt(lat, lng, sunPosition)`；晨昏线用 `calculateDayNightBoundary`（按经度采样，用 `atan` 而不是 `atan2`）。
- 白昼阈值：太阳高度角 `> -0.833°`。
- 城市的 `isDaytime` 在 `timeStore.updateCityTimes()` 里统一计算，`useTimeStore().cities` 和 `useTimeState().cities` 都可以直接用，不要在组件里另算一套。
- 经纬度 → 3D 统一用 `CoordinateUtils.latLngToVector3`：入参是**度**；北极是 `+Y`；`lng=0 → +X`，`lng=+90 → -Z`；默认半径 2。逆变换是 `vector3ToLatLng`。项目里另有 3 份重复/内联的坐标转换，新增代码不要再复制。

## 代码约定

- 2 空格、单引号、分号、printWidth 80（`.prettierrc`）；实际项目未强制跑 Prettier。
- 组件用**命名导出** `export const X: React.FC<Props> = ...`，只有 `App` 用 default export；Props 接口写在组件文件内。
- Hook `useXxx.ts`；store `xxxStore.ts` 导出 `useXxxStore`；工具类是 PascalCase 静态方法类（`TimeCalculator` / `TimeFormatter` / `SunPositionCalculator`）。
- 注释和 UI 文案用中文，标识符英文。
- 样式全部 Tailwind utility，`darkMode: 'class'`，主题由 `settingsStore` 在 `<html>` 上加 `light` / `dark`；不用 `@apply`、CSS Modules 或组件级 CSS 文件。
- import：跨目录用别名，同目录用相对路径，两种风格并存。可用别名：`@`、`@components`、`@utils`、`@hooks`、`@store`、`@data`。
  - **没有 `@types` 别名**（已删除，TypeScript 会把它当成 `node_modules/@types` 下的声明包）。类型导入用 `@/types/...` 或相对路径。
- 新增城市：在 `src/data/cities.ts` 的 `MAJOR_CITIES` 里补 IANA 时区、经纬度、国家、静态 `utcOffset`（只用于排序/分组）。

## 已知问题

所有 bug、技术债与文档差异统一记录在 **`docs/当前问题.md`**，按 P0 / P1 / P2 分级，附位置、现象、影响与修复建议。改动相关模块前先读该文档；修好一条就把对应条目勾选为完成。
