# 世界时间网页（world-time）

## 项目目标

用网页可视化全世界的时间与太阳光照：以北京时间（`Asia/Shanghai`）为基准，通过滚轮前后滚动 ±24 小时，观察各时区时间与昼夜的变化。

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
                    ├─ Header（主题切换、北京时间、实时/偏移状态）
                    ├─ Sidebar → WorldClock → CityTimeCard
                    │            TimezoneSelector
                    ├─ EarthVisualization → WorldMap2D   ← 唯一实际渲染的视图
                    └─ TimeSlider
```

- **`WorldMap2D`**：单个 `<canvas>` + 等距圆柱投影。大陆是手写矩形区块（非 GeoJSON）、昼夜为横向色带、太阳光晕、城市点/标签、点击命中检测。依赖变化时整块 canvas 全量重绘。
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
   - `beijingTime: DateTime`（Luxon，`Asia/Shanghai`）是**唯一时间事实来源**；`utcTime` 只是派生镜像，无消费者。
   - `timeOffset: number`，单位**分钟**，范围 ±1440。
   - `cities` 是由 `selectedCities` 派生出的 `CityTimeData[]`。
   - 模块加载时自动启动 1s interval（实时模式）并初始化城市，不是 React effect。
2. **`settingsStore`（persist 到 `world-time-settings`）**：主题（唯一真正可用的设置 UI）、语言、时间格式等。
3. **`visualizationStore`**：主要服务未启用的 3D。实际只消费 `selectedCity`。

Hooks 分工：

- `useTimeState`：时间展示 + 给城市补正确的 `isDaytime`，返回增强后的 `cities`。**要显示/判断昼夜必须用它。**
- `useSunPosition`：由 `beijingTime` 计算太阳位置、晨昏线、日出日落。
- `useScrollControl`：document 级 wheel / keydown。
- `useWindowSize` / `useBreakpoint`：响应式（768px 断点）。

**滚轮链路**：`document wheel` → `useScrollControl`（`preventDefault`；若在实时模式先退出；只取 `deltaY` 符号，每个事件 **1 分钟**；clamp ±1440）→ `timeStore.setTimeOffset` → `DateTime.now().plus({minutes})` → `updateCityTimes()` 对每个城市 `setZone(city.timezone)` → 组件重渲染 + `WorldMap2D` 全量重绘。

**键盘**：`←/→` ±1 分钟、`Space` 切换实时、`Home` 把 offset 归零（不会恢复实时走动）。帮助面板宣称的 PageUp/Down、Ctrl 精细控制**未实现**。

## 时间与天文约定（最容易踩坑）

- 一切时间运算用 Luxon `DateTime`；跨时区显示用 `beijingTime.setZone(city.timezone).toFormat(...)`。
- **不要** `toJSDate()` + `Intl.DateTimeFormat` 且不传 `timeZone`——会按运行环境时区格式化（`utils/formatters.ts` 里有这种写法，跨日会显示错星期）。
- `setTimeOffset` 每次以“当下 now + offset”为锚点，不是冻结基准；间隔一会儿再滚会跳变。
- `CityData.utcOffset` 单位是**小时**，是标准时、**不随夏令时变化**；当前真实偏移用 `setZone(...).offset / 60` 或 `toFormat('ZZ')`。排序/分组仍在用静态值，DST 期间会偏差一小时。
- 太阳位置来自 `utils/sunCalculations.ts` 的自研 NOAA 近似；`suncalc` 只在 `calculateSunlightData` 里用了 `getTimes`，且默认坐标 `(0,0)`、UI 未消费。
- **已知致命 bug**：`sunPosition.longitude` 用的是 `sunTrueLong + 180`（黄经），缺少地球自转（GMST/时角），**不是太阳直射点经度**，一天内几乎不变。`isDaylight`、2D 昼夜色带、城市昼夜图标因此整体错位。修正方向：`lng = normalize(RA - GMST)`，或最小改动 `normalize(-hourAngle)`，或直接用 `SunCalc.getPosition`。注意它返回**弧度**。
- 白昼阈值：太阳高度角 `> -0.833°`。
- `timeStore.calculateCityTime` 里 `isDaytime` 硬编码为 `true`；`WorldClock` 直接读 `useTimeStore().cities`，所以**侧栏永远显示太阳**。需要正确昼夜时用 `useTimeState()`。
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

会直接影响日常开发的一点（详见该文档）：

- 太阳直射点经度计算错误（P0-1），所有昼夜相关结果在修复前都不可信。
