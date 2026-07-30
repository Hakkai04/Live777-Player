# 🎥 Live777 Player

基于 [Live777](https://github.com/binbat/live777) WebRTC SFU 引擎构建的独立高性能流媒体播放器客户端。支持 **WebRTC/WHEP（拉流播放）** 和 **WHIP（摄像头推流）** 双模式，提供完整的播放控制、实时流状态统计、多路摄像头管理和响应式 Web/移动端布局。

> **Live777 引擎** 是一个轻量级、高性能的边缘 WebRTC SFU（选择性转发单元）服务器。它以 **WHIP**（发布）和 **WHEP**（订阅）作为主要协议，并支持 RTP/RTSP 协议转换。

---

## 目录

- [功能特性](#功能特性)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [使用指南](#使用指南)
  - [Play 模式：拉流播放](#play-模式拉流播放)
  - [Publish 模式：摄像头推流](#publish-模式摄像头推流)
  - [多路摄像头管理](#多路摄像头管理)
  - [网格模式](#网格模式)
  - [移动端使用](#移动端使用)
  - [手机访问 PC 端 Player](#手机访问-pc-端-player)
- [服务端部署](#服务端部署)
- [开发指南](#开发指南)
- [技术栈](#技术栈)
- [浏览器兼容性](#浏览器兼容性)
- [常见问题](#常见问题)
- [相关项目](#相关项目)

---

## 功能特性

### Play 模式（拉流）

| 类别 | 功能 |
|------|------|
| **协议** | WebRTC/WHEP（主协议）、RTSP（通过 Live777 桥接） |
| **控制** | 播放 / 暂停 / 停止、音量滑块、静音切换、全屏、画中画 |
| **统计** | 分辨率、码率 (kbps)、帧率 (fps)、RTT (ms)、抖动 (ms)、丢包率 (%)、编解码器、连接状态 |
| **多路** | 频道播放列表，支持增删切换，localStorage 持久化，网格布局（1/4/9/16 路） |
| **键盘** | Space（播放/暂停）、F（全屏）、M（静音）、Escape（退出全屏） |
| **截图** | 一键 Canvas 捕获 → PNG 下载 |
| **自动恢复** | 看门狗机制，每 5 秒自动重连失败的 WebRTC 连接 |
| **历史记录** | 记住最近输入的流地址（最近 20 条） |
| **响应式** | 桌面端：三栏布局（频道栏 + 播放区 + 设置）；移动端：全宽播放器 + 可展开底部抽屉 |
| **触控** | 双击全屏、全屏模式下单击切换控制栏、iOS 点击切换控制栏 |

### Publish 模式（推流）

| 类别 | 功能 |
|------|------|
| **协议** | WHIP 推流到 Live777 SFU |
| **设备** | 摄像头选择、麦克风选择、自定义 Stream ID |
| **预览** | 推流前/推流中本地画面实时预览 |
| **状态** | 实时连接状态指示（空闲/连接中/推流中/错误） |
| **分享** | 推流成功后自动生成 WHEP 播放地址，一键复制，切换到 Play 模式即可观看 |
| **本地预览** | 自适应布局，移动端纵向堆叠 |

### UI / UX

| 类别 | 功能 |
|------|------|
| **暗色主题** | 全局暗色配色，增强对比度，文字清晰可辨 |
| **模式切换** | 顶部 Play / Publish 一键切换 |
| **网格切换** | 1/4/9/16 路按钮，桌面和移动端均可使用 |
| **移动优化** | 纯净播放画面（无遮挡），全屏后显示控制和统计；可展开底部频道抽屉 |

---

## 系统架构

```
                    ┌──────────────────────────────────────────────────┐
                    │              浏览器（Live777 Player）               │
                    │                                                  │
                    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────┐ │
                    │  │ WHEP    │  │ WHIP    │  │ 控制栏  │  │统计 │ │
                    │  │ 拉流    │  │ 推流    │  │         │  │面板 │ │
                    │  └────┬────┘  └────┬────┘  └─────────┘  └─────┘ │
                    │       │            │                             │
                    │       │ WHEP 订阅  │ WHIP 发布                   │
                    └───────┼────────────┼─────────────────────────────┘
                            │            │
                            ▼            ▼
                    ┌──────────────────────────────────┐
                    │       Live777 SFU（端口 7777）     │
                    │       选择性转发单元               │
                    └───────┬──────────────────────────┘
                            │ RTP
                            ▼
                    ┌──────────────────────────────────┐
                    │   RTSP 桥接（可选，端口 4001/4002）│
                    │   server-rust/ (Rust + axum)         │
                    └───────┬──────────────────────────┘
                            │ RTSP
                            ▼
                    ┌──────────────────────────────────┐
                    │        RTSP 摄像头 / IP 摄像头     │
                    └──────────────────────────────────┘
```

- **WHEP（WebRTC-HTTP Egress Protocol）**：IETF 标准，用于消费 WebRTC 流。播放器创建 `RTCPeerConnection`，通过 HTTP POST 向 `/whep/{streamId}` 发送 SDP offer，接收 SDP answer，将生成的 `MediaStream` 渲染到 `<video>` 元素中。
- **WHIP（WebRTC-HTTP Ingest Protocol）**：IETF 标准，用于发布 WebRTC 流。播放器采集本地摄像头和麦克风，创建 `RTCPeerConnection`，通过 HTTP POST 向 `/whip/{streamId}` 发送 SDP offer，完成推流。
- **RTSP**：浏览器不支持原生 RTSP。可选的桥接服务将 RTSP → RTP → WHEP 转换，使浏览器能播放 IP 摄像头画面。
- **统计**：每秒轮询 `RTCPeerConnection.getStats()`。从 `inbound-rtp`、`remote-inbound-rtp`、`candidate-pair` 和 `codec` 统计记录中解析关键指标。
- **状态管理**：Zustand store 管理 UI 状态；用户设置和频道列表通过 `persist` 中间件持久化到 `localStorage`。

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **Live777 引擎** 正在运行（参见[服务端部署](#服务端部署)）
- npm ≥ 9

### 安装运行

```bash
# 进入播放器目录
cd player

# 安装依赖
npm install

# 启动开发服务器
npm run dev
# → 浏览器打开 http://localhost:3000

# 生产构建
npm run build
# → 输出目录: player/dist/
```

### Docker 一键演示

```bash
# 启动 Live777 引擎（如果尚未运行）
docker run -d --name live777 -p 7777:7777 ghcr.io/binbat/live777-server:latest

# 启动播放器开发服务器
cd player && npm install && npm run dev
```

浏览器打开 **http://localhost:3000** 即可使用。

---

## 使用指南

### Play 模式：拉流播放

默认进入 Play 模式，用于观看 WebRTC 流。

#### 连接流

1. 在 URL 输入框中输入 WHEP 地址，例如 `http://localhost:7777/whep/your-stream-id`
2. 协议选择器会根据 URL 前缀自动识别 WHEP 或 RTSP
3. 点击 **Connect** 按钮（或按 Enter 键）
4. 播放器经历状态转换：`空闲` → `加载中` → `播放中`

> **如何获取 WHEP URL？** 切换到 Publish 模式推流后会自动生成；也可以使用任何 WHIP 客户端（OBS、FFmpeg、GStreamer）向 Live777 发布流后获得。

#### 播放控制

桌面端鼠标悬停在视频上时显示控制栏，2.5 秒无操作后自动隐藏。移动端在全屏模式下单击切换控制栏。

| 控件 | 说明 |
|------|------|
| ▶️ **播放 / 暂停** | 切换视频播放状态。暂停时 WebRTC 连接保持打开 |
| ⏹️ **停止** | 完全关闭 WebRTC 连接 |
| 🔉 **音量** | 滑块 0–100%，带静音切换，显示音量百分比 |
| 📺 **全屏** | 进入/退出全屏。移动端双击切换 |
| 🖼️ **画中画** | 将视频浮动在其他窗口之上（仅桌面端） |
| 📷 **截图** | 捕获当前视频帧并下载为 PNG |

#### 键盘快捷键

| 按键 | 操作 |
|------|------|
| `Space` | 播放 / 暂停 |
| `F` | 切换全屏 |
| `M` | 切换静音 |
| `Escape` | 退出全屏 |

#### 流状态统计

统计信息显示在播放区域右上角。桌面端始终可见（可在设置中关闭），移动端仅在全屏模式下显示。点击标题栏可折叠/展开。

| 指标 | 数据来源 | 更新频率 |
|------|----------|----------|
| **连接状态** | `RTCPeerConnection.connectionState` | 实时 |
| **分辨率** | `inbound-rtp.frameWidth × frameHeight` | 1 秒 |
| **码率** | `inbound-rtp.bytesReceived` 差值计算 | 1 秒 |
| **帧率** | `inbound-rtp.framesPerSecond` | 1 秒 |
| **编解码器** | `codec.mimeType` | 连接时 |
| **RTT** | `remote-inbound-rtp.roundTripTime` | 1 秒 |
| **抖动** | `inbound-rtp.jitter`（秒 → 毫秒） | 1 秒 |
| **丢包率** | 差值计算，> 2% 红色高亮 | 1 秒 |

---

### Publish 模式：摄像头推流

点击顶部的 **Publish** 按钮切换到推流模式，将本地摄像头和麦克风推流到 Live777。

#### 推流步骤

1. 点击顶部的 **Publish** 按钮
2. 浏览器请求摄像头和麦克风权限，点击 **允许**
3. 选择要使用的**摄像头**和**麦克风**（默认使用系统默认设备）
4. 输入 **Stream ID**（默认 `my-camera`，也可自定义）
5. 点击 **Start Publishing** 开始推流
6. 右侧出现**本地预览**画面，状态变为绿色 「Publishing」
7. 自动显示 **WHEP 播放地址**（如 `/whep/my-camera`）
8. 点击 **Copy Playback URL** 复制播放地址

#### 验证闭环

1. 复制 WHEP 地址后，切换到 **Play** 模式
2. 将复制的地址粘贴到 URL 输入框，点击 **Connect**
3. 即可在播放器中看到自己摄像头推流的画面（有短暂延迟的回环）

> **提示**：同 WiFi 下的其他设备（手机、平板）也可以打开 Player 输入相同的 WHEP 地址观看你的推流。

---

### 多路摄像头管理

**Channels** 侧边栏（桌面端）或底部可展开面板（移动端）管理你的流播放列表。

- **添加**：点击 `+`，输入频道名称（可选）和 WHEP/RTSP URL，点击 **Add**
- **切换**：点击任意频道将其切换为当前播放流
- **删除**：悬停频道点击 `×` 按钮
- **在线指示**：绿色圆点 = 流已连接；灰色 = 尚未连接

所有频道**持久化到 localStorage**——页面刷新或浏览器重启后依然保留。

> **注意**：桌面端和移动端的频道列表各自由各自的浏览器 localStorage 存储，不会自动同步。可在移动端手动添加相同的 WHEP URL 来观看同一个流。

---

### 网格模式

使用网格选择器（按钮 `1` / `4` / `9` / `16`）同时查看多路流：

- **1**：单路全屏播放当前频道
- **4**：2×2 网格，最多 4 路同步播放
- **9**：3×3 网格，最多 9 路同步播放
- **16**：4×4 网格，最多 16 路同步播放

网格选择器在桌面端和移动端均可使用（移动端连接后显示在播放区上方）。

> **注意**：每个网格单元维护独立的 WebRTC 连接。带宽随活跃流数量线性增长。空余的格子会显示虚线边框提示。

---

### 移动端使用

播放器针对移动端有专门优化的交互体验。

| 屏幕宽度 | 布局 |
|----------|------|
| **< 768px**（手机） | 单栏：全宽播放器 + URL 输入 + 可展开底部频道抽屉 |
| **≥ 768px**（桌面/平板） | 三栏：频道侧边栏 + 播放区（含网格切换） + 设置 |

#### 移动端交互

| 手势 | 行为 |
|------|------|
| **双击** | 切换全屏（进入全屏后自动显示控制栏和统计信息） |
| **全屏中单击** | 显示/隐藏控制栏和统计信息 |
| **iOS 单击** | 显示/隐藏控制栏（iOS 不支持全屏 API） |

- 移动端默认**纯净画面**，无任何遮挡
- 播放时短暂显示操作提示（4.5 秒后自动消失）
- 底部频道面板可展开/收起，收起时显示频道数量

#### RTSP 流

RTSP 通过 **RTSP 桥接服务**支持。

**工作原理：**

1. 输入 RTSP URL，例如 `rtsp://192.168.1.100:554/stream`
2. 播放器调用 RTSP 桥接 API（`POST /bridge/rtsp`）
3. 桥接服务向 Live777 注册 RTSP 源并返回 WHEP URL
4. 播放器连接到该 WHEP URL——整个过程对用户透明

**启动 RTSP 桥接服务：**

```bash
# Rust 版（推荐，编译期类型检查 + tracing 结构化日志）
cd player/server-rust && cargo run
# → 监听 http://localhost:4002

# Go 版（原版）
cd player/server && go run bridge.go
# → 监听 http://localhost:4001
```

**环境变量配置：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LIVE777_URL` | `http://localhost:7777` | Live777 引擎地址 |
| `BRIDGE_PORT` | `4001` | Go 桥接服务监听端口 |
| `BRIDGE_PORT` | `4002` | Rust 桥接服务监听端口 |

生产环境也可直接使用 FFmpeg 做 RTSP → WHIP 转换：

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-ip:554/stream" \
       -c copy -f webm "http://localhost:7777/whip/stream-id"
```

---

### 手机访问 PC 端 Player

Vite 开发服务器已配置 `host: '0.0.0.0'`，监听所有网络接口，手机可直接访问。

1. 确保手机和 PC **连接在同一个 WiFi** 下
2. PC 上运行 `npm run dev`，终端会显示 `Network: http://192.168.x.x:3000/`
3. 在手机浏览器地址栏输入 `http://192.168.x.x:3000`
4. 首次访问 Windows 可能弹出防火墙提示，**允许** Node.js 访问网络即可

> **提示**：在 PC 端 Publish 模式下推流摄像头，手机端切换到 Play 模式输入同一个 WHEP 地址，即可在手机上实时观看 PC 摄像头的画面。

---

## 服务端部署

### Live777 引擎

WebRTC 播放和推流都需要 Live777 引擎运行。

```bash
# 方式一：直接下载预编译二进制（Windows/macOS/Linux）
# 从 GitHub Releases 下载: https://github.com/binbat/live777/releases
# Windows: live777-v0.9.0-x86_64-pc-windows-msvc.zip
# 解压后运行:
./live777.exe -c live777.toml

# 方式二：使用 Docker
docker run -d \
  --name live777 \
  -p 7777:7777 \
  ghcr.io/binbat/live777-server:latest

# 方式三：从源码编译（需 Rust 工具链）
git clone https://github.com/binbat/live777
cd live777 && cargo build --release

# 验证运行状态
curl http://localhost:7777/
```

### RTSP 桥接服务

可选服务，用于接入 IP 摄像头的 RTSP 流。

```bash
cd player/server
go run bridge.go
```

---

## 开发指南

### 项目结构

```
player/
├── index.html                     # 入口 HTML
├── package.json                   # 依赖和脚本
├── vite.config.ts                 # Vite 配置（代理、host、别名、构建输出）
├── tsconfig.json                  # TypeScript 严格模式配置（7 项 strict 标志）
├── eslint.config.mjs              # ESLint flat config（strictTypeChecked）
├── playwright.config.ts           # Playwright E2E 测试配置
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions：类型检查、构建、E2E、Rust 检查
│
├── server/                        # Go RTSP 桥接（原版）
│   └── bridge.go
│
├── server-rust/                   # Rust RTSP 桥接（新版，axum 0.8）
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                # 服务启动、路由、CORS、关联 ID 中间件
│       ├── types.rs               # Serde 请求/响应类型
│       ├── state.rs               # Arc<RwLock<HashMap>> 共享状态
│       ├── error.rs               # thiserror 统一错误类型
│       ├── logging.rs             # tracing-subscriber 结构化日志
│       └── routes/
│           ├── health.rs          # GET /bridge/health
│           └── rtsp.rs            # POST/GET/DELETE /bridge/rtsp
│
├── tests/
│   └── player.spec.ts             # 14 个 Playwright E2E 测试场景
│
├── public/
│   └── push.html                  # 独立推流页面（早期原型）
│
└── src/
    ├── main.tsx                   # React 根节点挂载
    ├── App.tsx                    # 根组件：双端响应式布局、Play/Publish 模式切换
    ├── index.css                  # daisyUI 暗色主题 + Tailwind CSS v4
    │
    ├── types/
    │   └── index.ts               # 全部 TypeScript 类型和接口定义
    │
    ├── store/
    │   └── playerStore.ts         # Zustand stores（设置、频道、播放器状态）
    │
    ├── lib/
    │   ├── whep-client.ts         # WHEP 拉流客户端（RTCPeerConnection + whip-whep 库）
    │   ├── whip-client.ts         # WHIP 推流客户端（getUserMedia + RTCPeerConnection）
    │   ├── stats-parser.ts        # getStats() 报告解析器（码率/丢包率差值计算）
    │   ├── storage.ts             # localStorage 工具函数（URL 历史记录）
    │   └── logger.ts              # 结构化日志（JSON 格式、关联 ID、模块标记）
    │
    ├── hooks/
    │   ├── useWhepPlayer.ts       # WHEP 拉流生命周期 hook
    │   ├── useWhipPublisher.ts    # WHIP 推流生命周期 hook
    │   ├── useStreamStats.ts      # 每秒统计轮询 hook
    │   ├── useChannelManager.ts   # 频道 CRUD hook
    │   └── useFullscreen.ts       # 全屏 API hook
    │
    └── components/
        ├── LivePlayer.tsx          # 核心播放器（状态机、移动端触摸交互、全屏联动）
        ├── CameraPublisher.tsx     # 推流面板（设备选择、预览、WHEP URL 复制）
        ├── PlayerControls.tsx      # 控制栏（播放、音量、全屏、截图、画中画）
        ├── StreamStats.tsx         # 实时统计覆盖层（可折叠、丢包红色警告）
        ├── ChannelSwitcher.tsx     # 频道管理面板（CRUD、网格选择器）
        ├── UrlInput.tsx            # URL 输入栏（协议自动检测、历史记录）
        ├── VideoGrid.tsx           # 多路网格布局（CSS Grid、1/4/9/16）
        └── svg/
            └── icons.tsx           # 20 个 SVG 图标组件
```

### 可用脚本

```bash
npm run dev         # 启动 Vite 开发服务器（端口 3000，监听所有网络接口）
npm run build       # TypeScript 检查 + Vite 生产构建 → dist/
npm run preview     # 本地预览生产构建
npm run lint        # ESLint 检查
npm run lint:strict # ESLint 严格模式（警告也视为错误）
npm run test:e2e    # Playwright E2E 测试
npm run test:e2e:ui # Playwright 交互式 UI 模式
```

### 开发代理配置

Vite 开发服务器代理请求，开发时无需配置 CORS：

```
/whip/*   → http://localhost:7777  （Live777 WHIP 推流）
/whep/*   → http://localhost:7777  （Live777 WHEP 拉流）
/bridge/* → http://localhost:4001  （RTSP 桥接服务）
```

---

## AI Vibe Coding 设计

本项目采用 **AI Vibe Coding** 理念重新设计技术栈，核心原则：**尽可能在编译期暴露问题，用严格约束限制 AI 生成代码的随意性**。

> AI 多写 20% 的类型代码，换来 80% 的 Debug 时间节约。

| 设计决策 | 理由 |
|----------|------|
| **TypeScript 7 项 strict 标志全开** | `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等让数组访问和可选属性在编译期就暴露问题 |
| **ESLint `strictTypeChecked`** | 禁用 `any`、不安全的 member/call/return，从源头防止宽松类型 |
| **Tailwind CSS + daisyUI** | 原子化 CSS 防止 AI 发明混乱样式；daisyUI 语义组件约束 UI 结构 |
| **Rust + axum 替代 Go** | 编译期保证无数据竞争、无 nil 指针、错误穷举；Serde 编译期校验 JSON |
| **结构化日志（JSON）** | 含关联 ID、模块标记、ISO 时间戳——AI 可快速归因和定位问题 |
| **Playwright E2E CI** | 每次 PR 自动回归测试，防止 AI 生成代码引入回归 |

---

## CI/CD

GitHub Actions 工作流（`.github/workflows/ci.yml`）：

| Job | 内容 |
|-----|------|
| **TypeCheck + Lint** | `tsc --noEmit` + `eslint src/` |
| **Build** | Vite 生产构建 |
| **Playwright E2E** | 14 个测试场景，覆盖 URL 输入 / 播放控制 / 频道管理 / 网格模式 / 推流 / 移动端布局 |
| **Rust Check** | `cargo check` + `cargo clippy -- -D warnings` + `cargo test` |

触发条件：`push` / `pull_request` 到 `main` 分支。

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org) | 5.6 | 类型安全（7 项 strict 标志全开） |
| [Vite](https://vitejs.dev) | 5.4 | 构建工具和开发服务器 |
| [Tailwind CSS](https://tailwindcss.com) + [daisyUI](https://daisyui.com) | 4.3 / 5.7 | 原子化 CSS + 语义组件库 |
| [whip-whep](https://www.npmjs.com/package/whip-whep) | 1.2.0 | WHIP/WHEP IETF 协议客户端库 |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | 状态管理（含 localStorage 持久化） |
| [ESLint](https://eslint.org) | 10.x | `strictTypeChecked` 规则集 |
| [Rust](https://www.rust-lang.org) + [axum](https://docs.rs/axum) | 0.8 | RTSP 桥接服务（类型安全编译期检查） |
| [Playwright](https://playwright.dev) | 1.62 | E2E 自动化回归测试 |
| Go | 1.21 | RTSP 桥接服务（原版，逐步迁移至 Rust） |

---

## 浏览器兼容性

| 浏览器 | WHEP 拉流 | WHIP 推流 | 全屏 | 画中画 |
|--------|:---:|:---:|:---:|:---:|
| Chrome 90+ | ✅ | ✅ | ✅ | ✅ |
| Firefox 90+ | ✅ | ✅ | ✅ | ❌ |
| Edge 90+ | ✅ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ | ✅（仅 iPadOS） |
| Chrome Android | ✅ | ✅ | ✅ | ❌ |
| Safari iOS | ✅ | ✅ | ❌（无 API，使用点击显示控制） | ❌ |

> **iOS Safari 注意**：`playsInline` 已默认设置。全屏 API 不可用——使用单击来显示/隐藏控制栏和统计信息。自动播放可能需要用户先进行一次交互操作。

---

## 常见问题

### 连接失败怎么办？

1. 确认 Live777 引擎正在运行：`curl http://localhost:7777/`
2. 确认 WHEP URL 中的流 ID 正确且流正在发布
3. 检查浏览器控制台是否有错误（如 CORS、网络不通）
4. 在 Chrome 中查看 `chrome://webrtc-internals` 了解 WebRTC 详细日志

### 为什么看不到视频？

- 确认流有视频轨道（仅音频流不会显示画面）
- 部分 iOS 版本需要用户先触摸屏幕以允许自动播放
- 检查防火墙是否阻止了 WebRTC 端口
- 如果通过 IP 地址访问，确保 Vite 开发服务器正常监听网络接口

### 手机访问不了 PC 上的 Player？

1. 确认手机和 PC 在同一 WiFi 下
2. PC 端 `npm run dev` 终端显示的 Network 地址即为手机访问地址
3. 检查 Windows 防火墙——需要允许 Node.js 的网络访问
4. 尝试在手机浏览器直接输入 `http://<PC的IP>:3000`

### 如何降低延迟？

- 在设置中将缓冲策略切换为"低延迟"
- 使用有线网络连接
- 确认 Live777 引擎和播放器之间网络延迟较低

### 支持多少路同时播放？

理论上受网络带宽和 CPU 性能限制。播放器支持最多 16 路网格视图，但建议根据实际带宽调整。每个网格单元独立维护 WebRTC 连接，带宽线性增长。

### 推流后怎么让别人看到？

推流成功后会自动显示 WHEP 播放地址（如 `/whep/my-camera`）。复制这个地址，同一网络下的其他设备在浏览器打开 Player，切换到 Play 模式，输入该地址即可观看。

---

## 相关项目

- [Live777 引擎](https://github.com/binbat/live777) — WebRTC SFU 服务器
- [WOOM](https://github.com/binbat/woom) — 基于 Live777 的自托管会议服务
