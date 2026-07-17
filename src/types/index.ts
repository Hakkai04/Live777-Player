// ============ Player State ============

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

export type StreamProtocol = 'whep' | 'rtsp'

// ============ Stream Statistics ============

export interface Resolution {
  width: number
  height: number
}

export interface LatencyInfo {
  rtt: number       // Round-trip time in ms
  jitter: number    // Jitter in ms
}

export interface StreamStats {
  resolution: Resolution
  bitrate: number           // kbps
  frameRate: number         // fps
  latency: LatencyInfo
  packetLoss: number        // percentage (0-100)
  codec: string             // MIME type e.g. "video/VP8"
  connectionState: string   // RTCPeerConnection.connectionState
  timestamp: number         // last update time
}

// ============ Channel (Camera) ============

export interface Channel {
  id: string
  name: string
  url: string
  protocol: StreamProtocol
  online: boolean
  thumbnail?: string        // base64 or URL
  addedAt: number           // timestamp
}

// ============ Grid Layout ============

export type GridMode = 'single' | '2x2' | '3x3' | '4x4'

// ============ Player Settings ============

export interface PlayerSettings {
  volume: number            // 0-100
  muted: boolean
  autoPlay: boolean
  showStats: boolean
  gridMode: GridMode
  buffering: 'auto' | 'low' | 'normal' | 'high'
}

// ============ WHEP Connection ============

export interface WhepConnection {
  pc: RTCPeerConnection
  stream: MediaStream
  state: PlayerState
  error: Error | null
}

// ============ Snapshot ============

export interface Snapshot {
  dataUrl: string
  timestamp: number
}
