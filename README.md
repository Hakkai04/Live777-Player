# 🎥 Live777 Player

基于 [Live777](https://github.com/binbat/live777) WebRTC SFU 引擎的独立流媒体播放器客户端。支持 **WHEP 拉流播放**与 **WHIP 摄像头推流**双模式，提供完整的播放控制、实时流状态统计、多路并发播放和响应式 Web/移动端适配。

---

## 目录

- [核心任务与验收](#核心任务与验收)
- [功能清单](#功能清单)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [设计理念](#设计理念)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [CI/CD](#cicd)
- [开发指南](#开发指南)

---

## 核心任务与验收

| # | 核心任务 | 状态 | 实现方式 |
|---|----------|:----:|----------|
| 1 | WebRTC 协议接入 | ✅ | `WhepClient` 封装 `whip-whep` 库，管理 `RTCPeerConnection` 完整生命周期，含看门狗自动重连 |
| 2 | RTSP 协议接入 | ✅ | 前端自动调用 Rust/Go 桥接服务（`POST /bridge/rtsp`），将 RTSP 源转为 WHEP 播放 |
| 3 | 播放控制 | ✅ | 播放/暂停/停止、音量滑块、静音、全屏、画中画、截图、键盘快捷键（Space/F/M/Escape） |
| 4 | 推流控制 | ✅ | WHIP 协议推流，摄像头/麦克风设备选择，本地实时预览，WHEP 播放地址一键复制 |
| 5 | 流状态统计 | ✅ | 分辨率、码率(kbps)、帧率(fps)、RTT(ms)、抖动(ms)、丢包率(%)、编解码器、连接状态 — 1 秒轮询 |
| 6 | 多路摄像头切换 | ✅ | 频道 CRUD + localStorage 持久化、网格布局 1/4/9/16 路、点击切换、在线状态指示 |
| 7 | Web 端适配 | ✅ | 桌面三栏布局（频道栏 + 播放区 + 设置面板），可折叠侧边栏，hover 显示控制栏 |
| 8 | 移动端适配 | ✅ | 全宽播放器 + 可展开底部抽屉、双击全屏、触摸显示控制栏、响应式旋转适配 |

### 性能验收

| 目标 | 状态 | 说明 |
|------|:----:|------|
| 首帧加载 < 1s | ✅ 可测量 | `WhepClient.firstFrameMs` 记录 `performance.now()` 从连接到首帧的精确耗时 |
| 端到端延迟 < 500ms | ✅ 可测量 | RTT + 抖动实时显示；Buffering 策略（low/normal/high/auto）控制 `playoutDelayHint` |
| > 4 路并发播放 | ✅ 架构支持 | 最大 4×4=16 路网格，每路独立的 `RTCPeerConnection`；4 路以内自动连接 |

> **注**：延迟目标的绝对值取决于 Live777 SFU 部署位置和网络条件。播放器客户端已实现降低延迟的全部代码路径（低延迟 buffering、STUN 配置、看门狗自动恢复）。

---

## 功能清单

### Play 模式 — 拉流播放

| 功能 | 说明 |
|------|------|
| WHEP 拉流 | IETF 标准 WebRTC-HTTP Egress Protocol，通过 HTTP POST SDP offer 建立连接 |
| RTSP 桥接 | 输入 `rtsp://...` 地址自动通过桥接服务转换为 WHEP 播放，对用户透明 |
| 播放/暂停 | 暂停时保持 WebRTC 连接，恢复即开 |
| 停止 | 完全关闭 `RTCPeerConnection`，释放资源 |
| 音量控制 | 滑块 0-100%，带静音切换，显示百分比 |
| 全屏 | Fullscreen API + webkit 兼容，移动端双击切换 |
| 画中画 | PiP API，仅桌面端支持 |
| 截图 | Canvas 捕获当前视频帧 → PNG 下载 |
| 键盘快捷键 | `Space` 播放/暂停、`F` 全屏、`M` 静音、`Escape` 退出全屏 |
| 自动恢复 | 看门狗每 5 秒检测连接状态，断线自动重连 |

### 流状态统计

| 指标 | 数据来源 | 更新频率 |
|------|----------|----------|
| 连接状态 | `RTCPeerConnection.connectionState` | 实时 |
| 分辨率 | `inbound-rtp.frameWidth × frameHeight` | 1 秒 |
| 码率 | `inbound-rtp.bytesReceived` 差值计算 | 1 秒 |
| 帧率 | `inbound-rtp.framesPerSecond` | 1 秒 |
| 编解码器 | `codec.mimeType` | 实时 |
| RTT | `remote-inbound-rtp.roundTripTime` + `candidate-pair` 后备 | 1 秒 |
| 抖动 | `inbound-rtp.jitter`（秒 → 毫秒） | 1 秒 |
| 丢包率 | 差值计算百分比，> 2% 红色警告 | 1 秒 |

### Publish 模式 — 摄像头推流

| 功能 | 说明 |
|------|------|
| WHIP 推流 | IETF 标准 WebRTC-HTTP Ingest Protocol，`getUserMedia` → SDP offer → WHIP POST |
| 设备选择 | 动态枚举摄像头和麦克风列表，支持切换 |
| 自定义 Stream ID | 可指定推流 ID，默认 `my-camera` |
| 本地预览 | 推流前/推流中实时视频预览 |
| 状态指示 | 空闲/连接中/推流中/错误 — 四态指示灯 |
| WHEP 地址生成 | 推流成功后自动生成播放地址，一键复制 |

### 多路并发

| 功能 | 说明 |
|------|------|
| 频道管理 | 添加/删除/切换频道，名称自定义 |
| 持久化 | 频道列表和播放设置通过 Zustand `persist` 存入 localStorage |
| 网格布局 | 1 路 / 2×2 (4路) / 3×3 (9路) / 4×4 (16路) |
| 智能连接 | ≤4 路时全部自动连接，>4 路时点击激活再连接，节省带宽 |
| 在线指示 | 绿点/灰点实时反映频道连接状态 |
| URL 历史 | 最近 20 条输入地址自动保存，点击复用 |

### 响应式适配

| 平台 | 特性 |
|------|------|
| 桌面 | 三栏布局（侧边栏 + 播放器 + 设置），可折叠侧边栏，hover 显示控制栏 |
| 移动端 | 全宽播放器 + 可展开底部频道抽屉，双击全屏，触摸显示/隐藏控制栏 |
| 旋转适配 | `resize` 事件监听，横竖屏自动切换布局 |

---

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│              浏览器（Live777 Player）                 │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌──────┐  │
│  │ WHEP 拉流 │  │ WHIP 推流 │  │ 控制栏  │  │统计  │  │
│  │ RTCPeer  │  │ getUser  │  │ 全屏   │  │分辨率 │  │
│  │ Connection│  │ Media    │  │ 音量   │  │码率   │  │
│  └────┬─────┘  └────┬─────┘  └────────┘  │RTT   │  │
│       │              │                    └──────┘  │
│       │ WHEP 订阅    │ WHIP 发布                    │
└───────┼──────────────┼─────────────────────────────┘
        │              │
        ▼              ▼
┌──────────────────────────────────────────────────┐
│          Live777 SFU（端口 7777）                  │
│          选择性转发单元 / 协议转换                   │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│     RTSP 桥接 — Rust/axum（端口 4002）            │
│     POST /bridge/rtsp  →  WHEP URL               │
│     GET  /bridge/rtsp  →  活跃流列表               │
│     DELETE /bridge/rtsp/:id  →  移除桥接           │
└──────┬───────────────────────────────────────────┘
       │ RTSP
       ▼
┌──────────────────────────────────────────────────┐
│             RTSP 摄像头 / IP 摄像头                 │
└──────────────────────────────────────────────────┘
```

---

## 快速开始

### 环境要求

- **Node.js** ≥ 18
- **Live777 引擎** 运行在 `localhost:7777`（[安装指南](https://live777.pages.dev/zh/guide/installation)）
- （可选）Rust 工具链 — 仅 RTSP 桥接需要

### 安装运行

```bash
# 进入项目目录
cd player

# 安装依赖
npm install

# 启动 Live777 引擎（另开终端）
# 方式一：直接下载预编译二进制
# https://github.com/binbat/live777/releases
./live777.exe -c live777.toml

# 方式二：Docker
docker run -d --name live777 -p 7777:7777 ghcr.io/binbat/live777-server:latest

# 方式三：源码编译
git clone https://github.com/binbat/live777 && cd live777 && cargo build --release

# （可选）启动 RTSP 桥接（Rust 版）
cd server-rust && cargo run  # → 监听 0.0.0.0:4002

# 启动播放器开发服务器
npm run dev  # → http://localhost:3000
```

### 快速验证

1. **推流**：打开 http://localhost:3000 → 点击 **Publish** → 允许摄像头权限 → 点击 **Start Publishing**
2. **拉流**：切换到 **Play** 模式 → 输入 `/whep/my-camera` → 点击 **Connect**
3. **多路**：在侧边栏添加多个频道 → 切换到 2×2 网格模式

---

## 设计理念

**核心原则：编译期暴露问题 > 运行时 Debug。** 宁可在类型系统上多花代码，也要避免生产环境排查疑难杂症。

| 设计决策 | 说明 |
|----------|------|
| TypeScript 7 项 strict 标志全开 | `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等强制边界检查，数组访问和可选属性在编译期就暴露风险 |
| ESLint `strictTypeChecked` | 禁用 `any`、不安全调用/返回/成员访问，从源头杜绝类型绕过 |
| Tailwind CSS v4 + daisyUI v5 | 原子化 CSS 保证样式一致性；daisyUI 语义组件（`btn`/`card`/`input`）统一 UI 风格 |
| Rust + axum 桥接服务 | 编译期保证无数据竞争、无 nil 指针、错误穷举；Serde 在序列化层校验 JSON 结构 |
| 结构化 JSON 日志 | 含 `correlationId`、`module`、ISO 时间戳，便于 `grep`/`jq` 快速定位问题 |
| Playwright E2E 自动化测试 | 每次 PR 自动回归 25+ 测试场景，覆盖桌面和移动端，防止回归 |

### 技术栈

| 技术 | 用途 |
|------|------|
| React 18 + TypeScript 5.6 | UI 框架，7 项 strict 标志 |
| Tailwind CSS v4 + daisyUI v5 | 原子化 CSS + 语义组件 |
| Zustand 5.0 | 状态管理 + localStorage 持久化 |
| `whip-whep` 1.2.0 | WHIP/WHEP IETF 协议客户端库 |
| Vite 5.4 | 构建工具 + 开发服务器（含代理） |
| ESLint 10.x | `strictTypeChecked` — 0 errors |
| Playwright 1.62 | E2E 自动化测试 |
| Rust + axum 0.8 + tokio 1 | RTSP 桥接服务（编译期安全） |
| tracing + tracing-subscriber | Rust 端结构化日志 |

---

## 项目结构

```
player/
├── .github/workflows/ci.yml      # CI：TypeCheck、Build、E2E、Rust Check
├── eslint.config.mjs              # ESLint strictTypeChecked 配置
├── playwright.config.ts           # Playwright 桌面 + 移动端双项目
├── vite.config.ts                 # Vite 代理、别名、host 配置
├── tsconfig.json                  # 7 项 strict 标志全开
│
├── tests/
│   └── player.spec.ts             # 25 个 E2E 测试场景
│
├── server/                        # Go RTSP 桥接（原版）
├── server-rust/                   # Rust RTSP 桥接（新版）
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs                # axum 路由 + CORS + 关联 ID 中间件
│       ├── types.rs               # Serde 请求/响应类型
│       ├── state.rs               # Arc<RwLock<HashMap>> 共享状态
│       ├── error.rs               # thiserror 统一错误枚举
│       ├── logging.rs             # tracing-subscriber 结构化日志
│       └── routes/{health,rtsp}.rs
│
└── src/
    ├── main.tsx                   # 入口
    ├── App.tsx                    # 根组件：双端布局、Play/Publish 切换、RTSP 桥接
    ├── index.css                  # daisyUI 暗色主题
    ├── types/index.ts             # 全部 TS 类型定义
    ├── store/playerStore.ts       # Zustand stores
    ├── lib/
    │   ├── whep-client.ts         # WHEP 客户端：PC 管理 + 看门狗 + 首帧计时
    │   ├── whip-client.ts         # WHIP 客户端：getUserMedia + SDP 交换
    │   ├── rtsp-bridge.ts         # RTSP 桥接前端：POST /bridge/rtsp
    │   ├── stats-parser.ts        # getStats() 解析器
    │   ├── logger.ts              # 结构化日志：JSON + 关联 ID
    │   └── storage.ts             # localStorage 工具
    ├── hooks/
    │   ├── useWhepPlayer.ts       # WHEP 生命周期 hook
    │   ├── useWhipPublisher.ts    # WHIP 生命周期 hook
    │   ├── useStreamStats.ts      # 每秒统计轮询
    │   ├── useChannelManager.ts   # 频道 CRUD
    │   └── useFullscreen.ts       # 全屏 API（含 webkit）
    └── components/
        ├── LivePlayer.tsx         # 核心播放器：状态机 + 触摸 + buffering
        ├── CameraPublisher.tsx    # 推流面板：设备选择 + 预览 + 链接复制
        ├── PlayerControls.tsx     # 控制栏
        ├── StreamStats.tsx        # 统计覆盖层
        ├── ChannelSwitcher.tsx    # 频道管理面板
        ├── UrlInput.tsx           # URL 输入 + 历史记录
        ├── VideoGrid.tsx          # 多路网格布局
        └── svg/icons.tsx          # SVG 图标组件
```

---

## CI/CD

| Job | 触发条件 | 内容 |
|-----|----------|------|
| **TypeCheck + Lint** | push / PR → main | `tsc --noEmit` + `eslint src/` |
| **Build** | push / PR → main | Vite 生产构建 |
| **E2E** | push / PR → main | Playwright 25 测试场景 × 2 项目（桌面+移动） |
| **Rust Check** | push / PR → main | `cargo check` + `cargo clippy -D warnings` + `cargo test` |

```bash
npm run dev           # 开发服务器 → http://localhost:3000
npm run build         # 生产构建 → dist/
npm run lint          # ESLint
npm run lint:strict   # ESLint 严格模式（warnings → errors）
npm run test:e2e      # Playwright E2E
npm run test:e2e:ui   # Playwright 交互模式
```

---

## 许可证

本项目随 Live777 生态发布。Live777 引擎采用开源许可证，详见 [Live777 仓库](https://github.com/binbat/live777)。
