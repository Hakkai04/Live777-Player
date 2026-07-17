# 🎥 Live777 Player

A standalone, high-performance streaming video player client built on the [Live777](https://github.com/binbat/live777) WebRTC SFU engine. Supports **WebRTC (WHEP)** and **RTSP** protocols with full playback controls, real-time stream statistics, multi-camera management, and responsive Web/Mobile layouts.

> **Live777 Engine** is a lightweight, high-performance edge WebRTC SFU (Selective Forwarding Unit) server. It uses **WHIP** (publish) and **WHEP** (subscribe) as its primary protocols and supports RTP protocol conversion.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
  - [Connecting to a Stream](#connecting-to-a-stream)
  - [Playback Controls](#playback-controls)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
  - [Stream Statistics](#stream-statistics)
  - [Multi-Camera Management](#multi-camera-management)
  - [Grid Mode](#grid-mode)
  - [Mobile Usage](#mobile-usage)
  - [RTSP Streams](#rtsp-streams)
- [Server Setup](#server-setup)
  - [Live777 Engine](#live777-engine)
  - [RTSP Bridge](#rtsp-bridge)
- [Development](#development)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Browser Support](#browser-support)

---

## Features

| Category | Feature |
|----------|---------|
| **Protocols** | WebRTC/WHEP (primary), RTSP (via Live777 bridge) |
| **Controls** | Play / Pause / Stop, Volume slider, Mute toggle, Fullscreen, Picture-in-Picture |
| **Stats** | Real-time: Resolution, Bitrate (kbps), Frame Rate (fps), RTT (ms), Jitter (ms), Packet Loss (%), Codec, Connection State |
| **Multi-Camera** | Channel playlist with add/remove/switch, persisted to localStorage, grid layout (1/4/9/16) |
| **Keyboard** | Space (play/pause), F (fullscreen), M (mute), Escape (exit fullscreen) |
| **Screenshot** | One-click canvas capture → PNG download |
| **Auto-Recovery** | Watchdog auto-restarts failed WebRTC connections every 5 seconds |
| **URL History** | Remembers recent stream URLs for quick reconnect |
| **Responsive** | Desktop: three-column layout; Mobile: full-width player + bottom drawer |
| **Touch** | Double-tap fullscreen, swipe gestures, 44×44px touch targets |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Browser (Live777 Player)               │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ WHEP    │  │ Controls │  │ Stats    │  │ Channel  │  │
│  │ Client  │  │ Bar      │  │ Overlay  │  │ Switcher │  │
│  └────┬────┘  └──────────┘  └──────────┘  └──────────┘  │
│       │ WHEP (HTTP POST SDP)                              │
└───────┼──────────────────────────────────────────────────┘
        │
        ▼
┌───────────────┐     ┌──────────────┐
│  Live777 SFU  │◄───│  RTSP Camera │
│  (port 7777)  │ RTP │  (via bridge)│
└───────┬───────┘     └──────────────┘
        │
        ▼
┌───────────────┐
│  RTSP Bridge  │ (optional, port 4001)
│  server/      │
│  bridge.go    │
└───────────────┘
```

- **WHEP (WebRTC-HTTP Egress Protocol)**: IETF standard for consuming WebRTC streams. The player creates an `RTCPeerConnection`, sends an SDP offer via HTTP POST to `/whep/{streamId}`, receives an SDP answer, and renders the resulting `MediaStream` in a `<video>` element.
- **RTSP**: Not natively supported in browsers. The optional bridge service converts RTSP → RTP → WHEP so the player only needs to speak WHEP.
- **Stats**: `RTCPeerConnection.getStats()` is polled every second. Key metrics are parsed from `inbound-rtp`, `remote-inbound-rtp`, `candidate-pair`, and `codec` stat records.
- **State**: Zustand store manages UI state; settings and channel list are persisted to `localStorage`.

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Live777 Engine** running (see [Server Setup](#server-setup))
- npm ≥ 9

### Install & Run

```bash
# Navigate to player directory
cd player

# Install dependencies
npm install

# Start development server
npm run dev
# → Opens http://localhost:3000

# Production build
npm run build
# → Output: player/dist/
```

### One-Command Demo (with Docker)

```bash
# Start Live777 engine (if not already running)
docker run -d --name live777 -p 7777:7777 ghcr.io/binbat/live777-server:latest

# Start the player dev server
cd player && npm install && npm run dev
```

Then open **http://localhost:3000** in your browser.

---

## Usage Guide

### Connecting to a Stream

1. **Enter a WHEP URL** in the input bar at the top — e.g., `http://localhost:7777/whep/your-stream-id`
2. The protocol selector auto-detects `WHEP` or `RTSP` based on the URL prefix
3. Click **Connect** (or press Enter)
4. The player transitions through states: `idle` → `loading` → `playing`

> **Where to get a WHEP URL?** If you have the WOOM meeting app running, you can create a stream via its API (`POST /room/{roomId}/stream`), then connect to `/whep/{streamId}`. Or publish to Live777 directly using any WHIP client (OBS, FFmpeg, GStreamer).

### Playback Controls

The control bar appears when you **move the mouse over the video** and auto-hides after 2.5 seconds of inactivity.

| Control | Description |
|---------|-------------|
| ▶️ **Play / Pause** | Toggles video playback. When paused, the WebRTC connection is held open. |
| ⏹️ **Stop** | Fully closes the WebRTC connection. |
| 🔉 **Volume** | Slider 0–100%, with mute/unmute toggle. Shows volume percentage. |
| 📺 **Fullscreen** | Enter/exit fullscreen mode. Also supports double-tap on mobile. |
| 🖼️ **Picture-in-Picture** | Float the video over other windows (desktop only). |
| 📷 **Screenshot** | Captures the current video frame and downloads as PNG. |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Toggle Mute |
| `Escape` | Exit Fullscreen |

### Stream Statistics

Stats appear in the **top-right corner** of the video area during playback. Click the header to collapse/expand.

| Metric | Source | Update |
|--------|--------|--------|
| **State** | `RTCPeerConnection.connectionState` | Real-time |
| **Resolution** | `inbound-rtp.frameWidth × frameHeight` | 1s |
| **Bitrate** | `inbound-rtp.bytesReceived` delta | 1s |
| **FPS** | `inbound-rtp.framesPerSecond` | 1s |
| **Codec** | `codec.mimeType` | On connect |
| **RTT** | `remote-inbound-rtp.roundTripTime` or `candidate-pair.currentRoundTripTime` | 1s |
| **Jitter** | `inbound-rtp.jitter` (seconds → ms) | 1s |
| **Loss** | `packetsLost / (packetsReceived + packetsLost)` | 1s |

> **Tip**: Compare with `chrome://webrtc-internals` in Chrome to verify accuracy. Packet loss > 2% is highlighted in red.

### Multi-Camera Management

The **Channels** sidebar (desktop) or bottom panel (mobile) manages your stream playlist.

- **Add**: Click `+`, enter a channel name (optional) and WHEP/RTSP URL, then click **Add**
- **Switch**: Click any channel to switch playback to that stream
- **Remove**: Hover over a channel and click the `×` button
- **Online Indicator**: Green dot = stream has been connected; gray = not yet connected

All channels are **persisted to localStorage** — they survive page reloads and browser restarts.

### Grid Mode

View multiple streams simultaneously using the grid selector (buttons `1` / `4` / `9` / `16`) in the channel header:

- **Single**: Full-area player for the active channel
- **2×2**: 4 simultaneous streams
- **3×3**: 9 simultaneous streams
- **4×4**: 16 simultaneous streams

> **Note**: Each grid cell maintains its own WebRTC connection. Bandwidth scales linearly with active streams.

### Mobile Usage

The player is fully responsive:

| Screen Width | Layout |
|-------------|--------|
| **< 640px** (Phone) | Single-column: full-width player, URL input, bottom channel drawer |
| **640–1024px** (Tablet) | Two-column: player + compact sidebar |
| **> 1024px** (Desktop) | Three-column: channel sidebar + player + settings |

**Touch gestures:**
- **Double-tap** → Toggle fullscreen
- **Left/Right swipe** → Switch channels
- **Right-side vertical swipe** → Volume
- **Tap video** → Show/hide controls

### RTSP Streams

RTSP is supported through the **RTSP Bridge** service.

#### How it works

1. You enter an RTSP URL like `rtsp://192.168.1.100:554/stream`
2. The player calls the RTSP Bridge API (`POST /bridge/rtsp`)
3. The bridge registers the RTSP source with Live777 (RTP ingest) and returns a WHEP URL
4. The player connects to that WHEP URL — from your perspective, it's transparent

#### Setting up the RTSP Bridge

```bash
cd player/server
go run bridge.go
# → Listens on http://localhost:4001
```

**Configuration (environment variables):**

| Variable | Default | Description |
|----------|---------|-------------|
| `LIVE777_URL` | `http://localhost:7777` | Live777 engine URL |
| `BRIDGE_PORT` | `4001` | Bridge listen port |

**Bridge API:**

```http
# Register an RTSP source
POST /bridge/rtsp
Content-Type: application/json
{"url": "rtsp://camera.local:554/stream"}

# Response:
{
  "whepUrl": "http://localhost:7777/whep/abc123-def456",
  "streamId": "abc123-def456"
}

# List active bridges
GET /bridge/rtsp

# Remove a bridge
DELETE /bridge/rtsp/{streamId}
```

For production RTSP→WHEP conversion, you can also use **FFmpeg** directly:

```bash
ffmpeg -rtsp_transport tcp -i "rtsp://camera-ip:554/stream" \
       -c copy -f webm "http://localhost:7777/whip/stream-id"
```

---

## Server Setup

### Live777 Engine

The Live777 engine must be running for WebRTC playback.

```bash
# Using Docker (recommended)
docker run -d \
  --name live777 \
  -p 7777:7777 \
  ghcr.io/binbat/live777-server:latest

# Or with Docker Compose
cd ..
docker compose up -d redis live777
```

Verify it's running:
```bash
curl http://localhost:7777/
# Should return the Live777 web UI
```

### RTSP Bridge

The bridge is an optional Go service for RTSP-to-WHEP conversion.

```bash
cd player/server
go run bridge.go
```

---

## Development

### Project Structure

```
player/
├── index.html                     # Entry HTML
├── package.json                   # Dependencies & scripts
├── vite.config.ts                 # Vite config (proxy, aliases, build)
├── tsconfig.json                  # TypeScript config
├── uno.config.ts                  # UnoCSS shortcuts & presets
│
├── server/
│   └── bridge.go                  # RTSP → WHEP bridge service
│
├── public/                        # Static assets (optional)
│
└── src/
    ├── main.tsx                   # React root mount
    ├── App.tsx                    # Root component with responsive layout
    ├── index.css                  # Global styles (dark theme, scrollbar, slider)
    │
    ├── types/
    │   └── index.ts               # All TypeScript types & interfaces
    │
    ├── store/
    │   └── playerStore.ts         # Zustand stores (settings, channels, player state)
    │
    ├── lib/
    │   ├── whep-client.ts         # WHEP WebRTC client (RTCPeerConnection + whip-whep)
    │   ├── stats-parser.ts        # getStats() report parser
    │   └── storage.ts             # localStorage helpers
    │
    ├── hooks/
    │   ├── useWhepPlayer.ts       # WHEP connection lifecycle hook
    │   ├── useStreamStats.ts      # Periodic stats polling hook
    │   ├── useChannelManager.ts   # Channel CRUD hook
    │   └── useFullscreen.ts       # Fullscreen API hook
    │
    └── components/
        ├── LivePlayer.tsx          # Core video player (state machine, <video>)
        ├── PlayerControls.tsx      # Control bar (play, volume, fullscreen, screenshot)
        ├── StreamStats.tsx         # Real-time statistics overlay
        ├── ChannelSwitcher.tsx     # Multi-channel playlist panel
        ├── UrlInput.tsx            # Stream URL input with history
        ├── VideoGrid.tsx           # Multi-stream grid layout
        └── svg/
            └── icons.tsx           # 18 SVG icons
```

### Available Scripts

```bash
npm run dev         # Start Vite dev server on port 3000
npm run build       # TypeScript check + Vite production build → dist/
npm run preview     # Preview production build locally
```

### Dev Server Proxy

The Vite dev server proxies requests so you don't need CORS configuration during development:

```
/whip/*   → http://localhost:7777  (Live777 WHIP)
/whep/*   → http://localhost:7777  (Live777 WHEP)
/bridge/* → http://localhost:4001  (RTSP Bridge)
```

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev) | 18.3 | UI framework |
| [TypeScript](https://www.typescriptlang.org) | 5.6 | Type safety |
| [Vite](https://vitejs.dev) | 5.4 | Build tool & dev server |
| [UnoCSS](https://unocss.dev) | 0.64 | Atomic CSS engine |
| [whip-whep](https://www.npmjs.com/package/whip-whep) | 1.2.0 | WHIP/WHEP IETF protocol client |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | State management |
| [Go](https://go.dev) | 1.21 | RTSP bridge service |

---

## Browser Support

| Browser | WebRTC/WHEP | Fullscreen | Picture-in-Picture |
|---------|-------------|------------|-------------------|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Firefox 90+ | ✅ | ✅ | ❌ (no PiP API) |
| Edge 90+ | ✅ | ✅ | ✅ |
| Safari 15+ | ✅ | ✅ | ✅ (iPadOS only) |
| Chrome Android | ✅ | ✅ | ❌ |
| Safari iOS | ✅ | ❌ (no API) | ❌ |

> **Note for iOS Safari**: `playsInline` is required (already set). The fullscreen API is not available — use the native iOS video player fullscreen gesture instead. Autoplay may require a user gesture first.

---

## License

This player is part of the WOOM project ecosystem. See the [Live777](https://github.com/binbat/live777) repository for license information.

---

## Related Projects

- [Live777 Engine](https://github.com/binbat/live777) — WebRTC SFU server
- [WOOM](https://github.com/binbat/woom) — Self-hosted meeting service built on Live777
