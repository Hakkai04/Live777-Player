# 🎥 Live777 播放器

基于 [Live777](https://github.com/binbat/live777) WebRTC SFU 引擎构建的独立高性能流媒体播放器客户端。支持 **WebRTC (WHEP)** 和 **RTSP** 协议，提供完整的播放控制、实时流状态统计、多路摄像头管理和响应式 Web/移动端布局。

> **Live777 引擎** 是一个轻量级、高性能的边缘 WebRTC SFU（选择性转发单元）服务器。它以 **WHIP**（发布）和 **WHEP**（订阅）作为主要协议，并支持 RTP 协议转换。

---

## 目录

- [🎥 Live777 播放器](#-live777-播放器)
  - [目录](#目录)
  - [功能特性](#功能特性)
  - [系统架构](#系统架构)
  - [快速开始](#快速开始)
    - [环境要求](#环境要求)
    - [安装运行](#安装运行)
    - [Docker 一键演示](#docker-一键演示)
  - [使用指南](#使用指南)
    - [连接流](#连接流)
    - [播放控制](#播放控制)
    - [键盘快捷键](#键盘快捷键)
    - [流状态统计](#流状态统计)
    - [多路摄像头管理](#多路摄像头管理)
    - [网格模式](#网格模式)
    - [移动端使用](#移动端使用)
    - [RTSP 流](#rtsp-流)
      - [工作原理](#工作原理)
      - [启动 RTSP 桥接服务](#启动-rtsp-桥接服务)
  - [服务端部署](#服务端部署)
    - [Live777 引擎](#live777-引擎)
    - [RTSP 桥接服务](#rtsp-桥接服务)
  - [开发指南](#开发指南)
    - [项目结构](#项目结构)
    - [可用脚本](#可用脚本)
    - [开发代理配置](#开发代理配置)
  - [技术栈](#技术栈)
  - [浏览器兼容性](#浏览器兼容性)
  - [常见问题](#常见问题)
    - [连接失败怎么办？](#连接失败怎么办)
    - [为什么看不到视频？](#为什么看不到视频)
    - [如何降低延迟？](#如何降低延迟)
    - [支持多少路同时播放？](#支持多少路同时播放)
  - [相关项目](#相关项目)
  - [许可证](#许可证)

---

## 功能特性

| 类别 | 功能 |
|------|------|
| **协议** | WebRTC/WHEP（主协议）、RTSP（通过 Live777 桥接） |
| **控制** | 播放 / 暂停 / 停止、音量滑块、静音切换、全屏、画中画 |
| **状态** | 实时显示：分辨率、码率（kbps）、帧率（fps）、RTT（ms）、抖动（ms）、丢包率（%）、编解码器、连接状态 |
| **多路** | 频道播放列表，支持增删切换，localStorage 持久化，网格布局（1/4/9/16 路） |
| **键盘** | Space（播放/暂停）、F（全屏）、M（静音）、Escape（退出全屏） |
| **截图** | 一键 Canvas 捕获 → PNG 下载 |
| **自动恢复** | 看门狗机制，每 5 秒自动重连失败的 WebRTC 连接 |
| **历史记录** | 记住最近输入的流地址，快速重连 |
| **响应式** | 桌面端：三栏布局；移动端：全宽播放器 + 底部抽屉面板 |
| **触控** | 双击全屏、滑动手势切换、44×44px 触控区域 |

---

## 系统架构

```text
┌──────────────────────────────────────────────────────────┐
│                    浏览器（Live777 播放器）                 │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ WHEP    │  │ 控制栏   │  │ 状态面板 │  │ 频道     │  │
│  │ 客户端  │  │          │  │          │  │ 切换器   │  │
│  └────┬────┘  └──────────┘  └──────────┘  └──────────┘  │
│       │ WHEP（HTTP POST SDP 协商）                         │
└───────┼──────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐     ┌──────────────┐
│  Live777 SFU  │◄───│  RTSP 摄像头  │
│  (端口 7777)  │ RTP │  (通过桥接)   │
└───────┬───────┘     └──────────────┘
        │
        ▼
┌───────────────┐
│  RTSP 桥接    │ (可选，端口 4001)
│  server/      │
│  bridge.go    │
└───────────────┘
```

- **WHEP（WebRTC-HTTP Egress Protocol，WebRTC-HTTP 出口协议）**：IETF 标准，用于消费 WebRTC 流。播放器创建 `RTCPeerConnection`，通过 HTTP POST 向 `/whep/{streamId}` 发送 SDP offer，接收 SDP answer，将生成的 `MediaStream` 渲染到 `<video>` 元素中。
- **RTSP**：浏览器不支持原生 RTSP。可选的桥接服务将 RTSP → RTP → WHEP 转换，使播放器只需处理 WHEP 协议。
- **统计**：每秒轮询 `RTCPeerConnection.getStats()`。从 `inbound-rtp`、`remote-inbound-rtp`、`candidate-pair` 和 `codec` 统计记录中解析关键指标。
- **状态管理**：Zustand store 管理 UI 状态；设置和频道列表持久化到 `localStorage`。

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

### 连接流

1. 在顶部的输入框中**输入 WHEP URL**，例如 `http://localhost:7777/whep/your-stream-id`
2. 协议选择器会根据 URL 前缀自动识别 `WHEP` 或 `RTSP`
3. 点击**连接**按钮（或按 Enter 键）
4. 播放器经历状态转换：`空闲` → `加载中` → `播放中`

> **如何获取 WHEP URL？** 如果 WOOM 会议应用正在运行，可以通过其 API 创建流（`POST /room/{roomId}/stream`），然后连接到 `/whep/{streamId}`。也可以使用任何 WHIP 客户端（OBS、FFmpeg、GStreamer）直接向 Live777 发布流。

### 播放控制

控制栏在**鼠标移到视频上**时出现，2.5 秒无操作后自动隐藏。

| 控件 | 说明 |
|------|------|
| ▶️ **播放 / 暂停** | 切换视频播放状态。暂停时，WebRTC 连接保持打开。 |
| ⏹️ **停止** | 完全关闭 WebRTC 连接。 |
| 🔉 **音量** | 滑块 0–100%，带静音/取消静音切换。显示音量百分比。 |
| 📺 **全屏** | 进入/退出全屏模式。移动端支持双击切换。 |
| 🖼️ **画中画** | 将视频浮动在其他窗口之上（仅桌面端）。 |
| 📷 **截图** | 捕获当前视频帧并下载为 PNG 文件。 |

### 键盘快捷键

| 按键 | 操作 |
|------|------|
| `Space` | 播放 / 暂停 |
| `F` | 切换全屏 |
| `M` | 切换静音 |
| `Escape` | 退出全屏 |

### 流状态统计

统计信息显示在播放区域的**右上角**。点击标题栏可折叠/展开。

| 指标 | 数据来源 | 更新频率 |
|------|----------|----------|
| **连接状态** | `RTCPeerConnection.connectionState` | 实时 |
| **分辨率** | `inbound-rtp.frameWidth × frameHeight` | 1 秒 |
| **码率** | `inbound-rtp.bytesReceived` 差值计算 | 1 秒 |
| **帧率** | `inbound-rtp.framesPerSecond` | 1 秒 |
| **编解码器** | `codec.mimeType` | 连接时 |
| **RTT** | `remote-inbound-rtp.roundTripTime` 或 `candidate-pair.currentRoundTripTime` | 1 秒 |
| **抖动** | `inbound-rtp.jitter`（秒 → 毫秒） | 1 秒 |
| **丢包率** | `packetsLost / (packetsReceived + packetsLost)` | 1 秒 |

> **提示**：可在 Chrome 中打开 `chrome://webrtc-internals` 对比验证数据准确性。丢包率超过 2% 会以红色高亮显示。

### 多路摄像头管理

**频道**侧边栏（桌面端）或底部面板（移动端）管理你的流播放列表。

- **添加**：点击 `+`，输入频道名称（可选）和 WHEP/RTSP URL，点击**添加**
- **切换**：点击任意频道将其切换为当前播放流
- **删除**：鼠标悬停在频道上，点击 `×` 按钮
- **在线指示**：绿色圆点 = 流已连接；灰色 = 尚未连接

所有频道**持久化到 localStorage**——页面刷新或浏览器重启后依然保留。

### 网格模式

使用频道标题栏中的网格选择器（按钮 `1` / `4` / `9` / `16`）同时查看多路流：

- **单路**：全区域播放活跃频道
- **2×2**：4 路同步播放
- **3×3**：9 路同步播放
- **4×4**：16 路同步播放

> **注意**：每个网格单元维护独立的 WebRTC 连接。带宽随活跃流数量线性增长。

### 移动端使用

播放器完全响应式适配：

| 屏幕宽度 | 布局 |
|----------|------|
| **< 640px**（手机） | 单栏：全宽播放器 + URL 输入 + 底部频道抽屉 |
| **640–1024px**（平板） | 双栏：播放器 + 紧凑侧边栏 |
| **> 1024px**（桌面） | 三栏：频道侧边栏 + 播放器 + 设置面板 |

**触控手势：**
- **双击** → 切换全屏
- **左右滑动** → 切换频道
- **右侧纵向滑动** → 调节音量
- **点击视频** → 显示/隐藏控制栏

### RTSP 流

RTSP 通过 **RTSP 桥接服务**支持。

#### 工作原理

1. 输入 RTSP URL，例如 `rtsp://192.168.1.100:554/stream`
2. 播放器调用 RTSP 桥接 API（`POST /bridge/rtsp`）
3. 桥接服务向 Live777 注册 RTSP 源（RTP 接入）并返回 WHEP URL
4. 播放器连接到该 WHEP URL——整个过程对用户透明

#### 启动 RTSP 桥接服务

```bash
cd player/server
go run bridge.go
# → 监听 http://localhost:4001
```

**环境变量配置：**

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `LIVE777_URL` | `http://localhost:7777` | Live777 引擎地址 |
| `BRIDGE_PORT` | `4001` | 桥接服务监听端口 |

**桥接 API：**

```http
# 注册 RTSP 源
POST /bridge/rtsp
Content-Type: application/json
{"url": "rtsp://camera.local:554/stream"}

# 响应:
{
  "whepUrl": "http://localhost:7777/whep/abc123-def456",
  "streamId": "abc123-def456"
}

# 查看活跃桥接列表
GET /bridge/rtsp

# 移除桥接
DELETE /bridge/rtsp/{streamId}
```

对于生产环境的 RTSP→WHEP 转换，也可以直接使用 **FFmpeg**：

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-ip:554/stream" \
       -c copy -f webm "http://localhost:7777/whip/stream-id"
```

---

## 服务端部署

### Live777 引擎

WebRTC 播放需要 Live777 引擎运行。

```bash
# 使用 Docker（推荐）
docker run -d \
  --name live777 \
  -p 7777:7777 \
  ghcr.io/binbat/live777-server:latest

# 或使用 Docker Compose（在上级目录）
cd ..
docker compose up -d redis live777
```

验证运行状态：

```bash
curl http://localhost:7777/
# 应返回 Live777 Web UI 页面
```

### RTSP 桥接服务

桥接服务是一个可选的 Go 服务，用于 RTSP 到 WHEP 的协议转换。

```bash
cd player/server
go run bridge.go
```

---

## 开发指南

### 项目结构

```text
player/
├── index.html                     # 入口 HTML
├── package.json                   # 依赖和脚本
├── vite.config.ts                 # Vite 配置（代理、路径别名、构建输出）
├── tsconfig.json                  # TypeScript 配置
├── uno.config.ts                  # UnoCSS 快捷方式和预设
│
├── server/
│   └── bridge.go                  # RTSP → WHEP 桥接服务
│
├── public/                        # 静态资源（可选）
│
└── src/
    ├── main.tsx                   # React 根节点挂载
    ├── App.tsx                    # 根组件，含响应式布局
    ├── index.css                  # 全局样式（暗色主题、滚动条、滑块）
    │
    ├── types/
    │   └── index.ts               # 全部 TypeScript 类型和接口定义
    │
    ├── store/
    │   └── playerStore.ts         # Zustand stores（设置、频道、播放器状态）
    │
    ├── lib/
    │   ├── whep-client.ts         # WHEP WebRTC 客户端封装（RTCPeerConnection + whip-whep）
    │   ├── stats-parser.ts        # getStats() 报告解析器
    │   └── storage.ts             # localStorage 工具函数
    │
    ├── hooks/
    │   ├── useWhepPlayer.ts       # WHEP 连接生命周期 hook
    │   ├── useStreamStats.ts      # 定期统计轮询 hook
    │   ├── useChannelManager.ts   # 频道 CRUD hook
    │   └── useFullscreen.ts       # 全屏 API hook
    │
    └── components/
        ├── LivePlayer.tsx          # 核心视频播放器（状态机、<video> 绑定）
        ├── PlayerControls.tsx      # 控制栏（播放、音量、全屏、截图）
        ├── StreamStats.tsx         # 实时统计信息覆盖层
        ├── ChannelSwitcher.tsx     # 多路频道播放列表面板
        ├── UrlInput.tsx            # 流地址输入（含历史记录）
        ├── VideoGrid.tsx           # 多路网格布局
        └── svg/
            └── icons.tsx           # 18 个 SVG 图标组件
```

### 可用脚本

```bash
npm run dev         # 启动 Vite 开发服务器（端口 3000）
npm run build       # TypeScript 检查 + Vite 生产构建 → dist/
npm run preview     # 本地预览生产构建
```

### 开发代理配置

Vite 开发服务器代理请求，开发时无需配置 CORS：

```text
/whip/*   → http://localhost:7777  （Live777 WHIP）
/whep/*   → http://localhost:7777  （Live777 WHEP）
/bridge/* → http://localhost:4001  （RTSP 桥接服务）
```

---

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [React](https://react.dev) | 18.3 | UI 框架 |
| [TypeScript](https://www.typescriptlang.org) | 5.6 | 类型安全 |
| [Vite](https://vitejs.dev) | 5.4 | 构建工具和开发服务器 |
| [UnoCSS](https://unocss.dev) | 0.64 | 原子化 CSS 引擎 |
| [whip-whep](https://www.npmjs.com/package/whip-whep) | 1.2.0 | WHIP/WHEP IETF 协议客户端库 |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | 状态管理 |
| [Go](https://go.dev) | 1.21 | RTSP 桥接服务 |

---

## 浏览器兼容性

| 浏览器 | WebRTC/WHEP | 全屏 | 画中画 |
|--------|-------------|------|--------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Firefox 90+ | ✅ | ✅ | ❌（不支持 PiP API） |
| Edge 90+ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅（仅 iPadOS） |
| Chrome Android | ✅ | ✅ | ❌ |
| Safari iOS | ✅ | ❌（无 API） | ❌ |

> **iOS Safari 注意事项**：`playsInline` 已默认设置。全屏 API 不可用——建议使用 iOS 原生视频播放器的全屏手势。自动播放可能需要用户先进行一次交互操作。

---

## 常见问题

### 连接失败怎么办？

1. 确认 Live777 引擎正在运行：`curl http://localhost:7777/`
2. 确认 WHEP URL 中的流 ID 正确且流正在发布
3. 检查浏览器控制台是否有错误信息
4. 查看 `chrome://webrtc-internals`（Chrome）了解详细的 WebRTC 日志

### 为什么看不到视频？

- 确认流有视频轨道（仅音频流会显示波形但无画面）
- 部分 iOS 版本需要用户先触摸屏幕以允许自动播放
- 检查防火墙是否阻止了 WebRTC 端口

### 如何降低延迟？

- 在设置中将缓冲策略切换为"低延迟"
- 使用有线网络连接
- 确认 Live777 引擎和播放器之间网络延迟较低

### 支持多少路同时播放？

理论上受网络带宽和 CPU 性能限制。播放器支持最多 16 路网格视图，但建议根据实际带宽调整。

---

## 相关项目

- [Live777 引擎](https://github.com/binbat/live777) — WebRTC SFU 服务器
- [WOOM](https://github.com/binbat/woom) — 基于 Live777 的自托管会议服务
- [WOOM 演示](https://woom.binbat.com) — 在线演示站点

---

## 许可证

此播放器属于 WOOM 项目生态系统的一部分。许可证信息参见 [Live777](https://github.com/binbat/live777) 仓库。
