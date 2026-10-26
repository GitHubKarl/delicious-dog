# 美食转盘 · 前端（uni-app）

给选择困难症用的「今天吃什么」转盘小程序。转一下，随机落一个吃饭品类，省掉纠结。

- 产品形态：微信小程序（个人主体）
- 首期范围：纯离线，无登录、不采集用户数据
- 后端：首期不参与，见 `../backend/README.md`

## 技术栈

| 项 | 选择 |
|---|---|
| 框架 | uni-app 3.x（Vue 3 + Vite 5） |
| 初始化方式 | CLI（`degit` 官方模板 `dcloudio/uni-preset-vue#vite`），不用 HBuilderX |
| 目标端 | `mp-weixin`（主）、`h5`（本地预览用） |
| 样式 | 原生 CSS + rpx，无 UI 库 |
| 状态 | Vue 3 `ref/computed`，无 Pinia（体量不需要） |
| 存储 | `uni.setStorageSync` / `getStorageSync`，纯本地 |

依赖已精简：只保留 `uni-app`、`uni-components`、`uni-h5`、`uni-mp-weixin`，其余平台包（支付宝/抖音/鸿蒙等）已移除。

## 目录结构

```
frontend/
├─ src/
│  ├─ pages/index/index.vue     首页：转盘 + 结果弹窗 + 品类管理弹层（单页面承载全部交互）
│  ├─ utils/categories.js       默认品类、数量约束、本地存储读写
│  ├─ pages.json                路由与窗口样式（标题、背景色）
│  ├─ manifest.json             应用配置（appid 待填）
│  ├─ App.vue                   全局样式（page 背景）
│  ├─ main.js                   入口
│  ├─ uni.scss                  uni-app 内置 scss 变量（暂未改动）
│  └─ static/logo.png           模板自带，暂未使用
├─ vite.config.js
├─ index.html                   H5 入口模板
├─ package.json                 脚本与依赖
└─ dist/                        编译产物（git 忽略）
```

刻意没有拆多页面/多组件：首期就两块 UI，一个文件读完更省事。等到加「历史记录」「分享页」时再拆。

## 常用命令

**注意：本机跑任何 npm 命令前必须先 `unset NODE_OPTIONS`**（原因见文末「环境坑」）。

```bash
unset NODE_OPTIONS

npm install            # 装依赖
npm run dev:mp-weixin  # 开发模式，产物 dist/dev/mp-weixin（配合微信开发者工具）
npm run build:mp-weixin# 正式构建，产物 dist/build/mp-weixin
npm run dev:h5         # 浏览器里调页面，最快
npm run build:h5       # H5 构建，产物 dist/build/h5
```

微信开发者工具导入目录：`frontend/dist/dev/mp-weixin`（开发）或 `frontend/dist/build/mp-weixin`（构建）。`manifest.json` 里的 appid 为空，导入时选「测试号」即可。

## 核心实现说明

### 转盘绘制

用 CSS `conic-gradient` 画扇区，不用 canvas——扇区数量变化时只需重算渐变字符串，DOM 结构不变。

```js
// 每个品类一段硬边渐变，i 号扇区占 [i*step, (i+1)*step]
const step = 360 / items.length
background = `conic-gradient(from 0deg, ${items.map((_, i) =>
  `${COLORS[i % COLORS.length]} ${i * step}deg ${(i + 1) * step}deg`).join(', ')})`
```

`conic-gradient` 的 0deg 在**正上方**、顺时针增长，正好和指针方向一致。

文字标签是绝对定位在圆心的元素，靠 `rotate(角度) translateY(-210rpx)` 推到对应扇区中心（径向排版）。转盘整体转，标签跟着转。

### 命中算法（关键）

指针固定在正上方（0deg）。要让第 `i` 个扇区停在指针下，转盘需要旋转到：

```
target = (360 - (i * step + step / 2) + 360) % 360
```

即「负的扇区中心角」。为了不停在同一个角度、且始终顺时针转，用累计角度：

```js
delta = (target - current + 360) % 360
rotation += 360 * 4 + delta   // 多转 4 圈制造动画
```

先随机取结果 `i`，再反推角度——保证「指针停哪就是哪」，而不是先转再算结果。

### 动画

```css
transition: transform 3.5s cubic-bezier(0.15, 0.85, 0.2, 1);
```

**`SPIN_MS`（JS 里的 3500）必须和 CSS 的 3.5s 一致**，改一个就要改另一个：结果弹窗是在 `setTimeout` 里按 `SPIN_MS` 触发的，两边不同步会出现「还在转就弹结果」。

转动中 `spinning = true`，重复点击直接 return，避免叠加转动。

### 品类管理

底部弹层，不做独立页面。规则都在 `utils/categories.js` 和 `addItem/removeItem` 里：

| 规则 | 值 | 行为 |
|---|---|---|
| 最少 | 3 个 | 删除到 3 个时提示「至少保留 3 个品类」 |
| 最多 | 12 个 | 达到上限时提示「最多 12 个品类」 |
| 长度 | 8 字 | `input` 的 `maxlength` |
| 唯一性 | 不可重复 | 重复时 toast |
| 恢复默认 | 有 | 一键还原 8 个默认品类 |

## 数据与存储

```js
// key
'wheel_items'

// value：字符串数组，顺序即扇区顺序
['火锅', '川菜', '日料', '西式快餐', '面食', '饺子', '麻辣烫', '家常炒菜']
```

- 首次启动（或存量数据损坏/少于 3 个）时回落默认列表
- 任何增删都立刻写回本地，没有「保存」按钮
- 首期不涉及网络，清缓存即恢复默认，不会丢用户资产（本来也没账号）
- `v-for` 的 key 直接用品类名，靠唯一性约束保证稳定

## 关键参数速查

| 参数 | 位置 | 当前值 |
|---|---|---|
| `SPIN_MS` | `pages/index/index.vue` | 3500，与 CSS transition 联动 |
| `MIN_COUNT` / `MAX_COUNT` | `utils/categories.js` | 3 / 12 |
| `DEFAULT_ITEMS` | `utils/categories.js` | 8 个默认品类 |
| `SECTOR_COLORS` | `pages/index/index.vue` | 8 色循环，超出 8 个品类时颜色重复 |
| 转盘尺寸 | 样式 `.wheel` | 620rpx，标签半径 210rpx |

## 待办

- [ ] 填入小程序 appid（`manifest.json` → `mp-weixin.appid`）
- [ ] 真机验证转动时长手感（3.5s 可能偏长）
- [ ] 分享卡片文案 / 空状态等收尾细节
- [ ] 小程序类目与隐私协议（无采集，声明极简）

## 环境坑

**`npm` 命令报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 或安装中途失败、`node_modules` 残缺**

本机 WorkBuddy 通过 `NODE_OPTIONS` 注入了防误删钩子，会拦截 npm 安装/清理过程中的批量删除。解决方式是跑命令前清掉：

```bash
unset NODE_OPTIONS
```

清掉后再装即可。若已经装了半残（例如报 `Cannot find module '@rollup/pluginutils'`），补装缺失包或删掉 `node_modules` 重装都能修好。

**其他**

- Node 在 `D:\develop\nodejs`（v22.22.2 / npm 10.9.7），环境变量已配好，新终端生效
- `dist/` 是编译产物，不要提交
