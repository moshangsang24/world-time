# 世界时间可视化

在一张世界地图上同时看各城市的当地时间和全球昼夜分布。以洛杉矶时间为基准，可以把时间前后拨动 24 小时，观察各时区时间和晨昏线的变化。

## 功能

- **2D 世界地图**：真实海岸线与国界（Natural Earth 1:110m），等距圆柱投影。
- **昼夜分布**：按太阳高度角实时计算夜面，带曙暮光渐变和晨昏线；太阳画在真实直射点。
- **世界时钟**：侧栏显示各城市的当地时间、日期、星期、UTC 偏移、昼夜状态，以及相对洛杉矶的时差。
- **时间控制**：滚轮、键盘、滑块或快捷按钮，在当前时刻前后 24 小时内移动。
- **城市管理**：从 18 个预置城市中增删，列表保存在浏览器本地。
- **主题**：浅色 / 深色，地图配色随主题切换。

## 快速开始

需要 Node.js 18 或更高版本。

```bash
npm install
```

```bash
npm run dev
```

然后打开 `http://localhost:3000`。

## 操作

| 操作 | 效果 |
|---|---|
| 在地图或时间控制区滚动滚轮 | 时间前进 / 后退，每格 1 分钟 |
| `←` / `→` | 时间后退 / 前进 1 分钟 |
| `空格` | 暂停 / 恢复实时 |
| `Home` | 回到当前时间并恢复实时 |
| 拖动底部滑块、点快捷按钮 | 跳到指定偏移；“现在”恢复实时 |
| 点击地图上的城市或侧栏卡片 | 选中城市，两边同步高亮；再点一次取消 |

拨动时间后进入暂停状态，偏移以暂停那一刻为起点计算。

## 基准时区

基准时区定义在 `src/data/constants.ts` 的 `BASE_ZONE`：

```ts
export const BASE_ZONE = {
  timezone: 'America/Los_Angeles',
  label: '洛杉矶时间',
  cityId: 'los-angeles',
} as const;
```

换基准只需要改这一处。`cityId` 必须是 `src/data/cities.ts` 里存在的城市。

## 脚本

| 命令 | 说明 |
|---|---|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 类型检查并构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run type-check` | TypeScript 类型检查 |
| `npm run lint` | ESLint |
| `npm test` | 运行单元测试（vitest） |

## 技术栈

React 18、TypeScript、Vite 5、Zustand、Luxon、Tailwind CSS。地图数据来自 `world-atlas`，用 `topojson-client` 解码后画在 canvas 上。太阳位置用 NOAA 算法计算，测试里用 `suncalc` 做对照。

```
src/
├── components/
│   ├── common/          通用组件
│   ├── layout/          页面布局、顶栏、侧栏
│   ├── time/            世界时钟、城市卡片、时间滑块
│   └── visualization/   2D 地图（map2d/ 下是各绘制层）
├── hooks/               时间状态、太阳位置、滚轮与键盘控制
├── store/               Zustand store
├── utils/               时间、太阳位置、坐标计算
├── data/                城市数据与常量
└── types/               类型定义
```

## 预置城市

- 亚洲：北京、上海、东京、新加坡、孟买、迪拜
- 欧洲：伦敦、巴黎、柏林、莫斯科
- 美洲：洛杉矶、芝加哥、纽约、多伦多、圣保罗
- 大洋洲：悉尼、墨尔本
- 非洲：开罗

## 尚未实现

- 3D 地球视图（代码在 `src/components/visualization/` 里，但没有接入页面）
- 设置面板、12 小时制、语言切换
- 日出日落时间显示
- 移动端触摸手势调时间

已知问题与技术债见 `docs/当前问题.md`，需求和技术方案的目标态见 `docs/` 下另外两份文档。

## License

MIT
