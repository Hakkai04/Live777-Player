import { WHEPClient } from 'whip-whep/whep'
import type { PlayerState } from '@/types'

/**
 * WHEP Client wrapper for receiving WebRTC streams from Live777.
 *
 * Lifecycle:
 *   1. Create a new WhepClient instance with a WHEP URL
 *   2. Call connect() to establish the WebRTC connection
 *   3. MediaStream becomes available via getStream()
 *   4. Call disconnect() when done
 *
 * Watchdog: Auto-restarts on disconnection after 5s if the stream was connected.
 */

const WATCHDOG_INTERVAL = 5000

const RESTART_STATES: string[] = ['disconnected', 'failed', 'closed']

/**
 * Normalize a WHEP URL.
 *
 * Two concerns:
 * 1. CORS — when the player is on localhost:3000 and the user enters
 *    http://localhost:7777/whep/111, the browser blocks cross-origin fetch.
 *    Fix: re-point to the current origin so it goes through Vite proxy.
 * 2. The whip-whep library needs an absolute URL (new URL() is used internally).
 *    A bare stream ID or relative path won't work.
 *
 * Auto-convert:
 *   http://localhost:7777/whep/111  →  http://localhost:3000/whep/111
 *   111                              →  http://localhost:3000/whep/111
 *   /whep/111                        →  http://localhost:3000/whep/111
 *   https://remote.example.com/whep/abc → keep as-is (remote server)
 */
function normalizeUrl(input: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

  // Bare stream ID like "111" or "my-camera" → http://localhost:3000/whep/xxx
  if (/^[\w-]+$/.test(input)) return `${origin}/whep/${input}`

  // Relative path like /whep/111 → resolve against current origin
  if (input.startsWith('/')) return new URL(input, origin).href

  // Convert localhost/127.0.0.1 absolute URLs to use our origin (Vite proxy)
  const localMatch = input.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/(?:whep|whip)\/\S+)$/i
  )
  if (localMatch) return new URL(localMatch[1], origin).href

  // Any other URL that contains /whep/ or /whip/ — extract the path, resolve locally
  const whepMatch = input.match(/(\/(?:whep|whip)\/\S+)$/)
  if (whepMatch) return new URL(whepMatch[1], origin).href

  // Remote absolute URLs — pass through as-is
  return input
}

export class WhepClient {
  private pc: RTCPeerConnection | null = null
  private client: WHEPClient
  private stream: MediaStream
  private url: string
  private timer: ReturnType<typeof setInterval> | null = null
  private _state: PlayerState = 'idle'
  private _error: Error | null = null

  // Callbacks
  private onStateChange: ((state: PlayerState) => void) | null = null
  private onStreamReady: ((stream: MediaStream) => void) | null = null
  private onError: ((err: Error) => void) | null = null

  constructor(url: string) {
    this.url = normalizeUrl(url)
    this.client = new WHEPClient()
    this.stream = new MediaStream()
  }

  get state(): PlayerState {
    return this._state
  }

  get error(): Error | null {
    return this._error
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc
  }

  getStream(): MediaStream {
    return this.stream
  }

  setCallbacks(callbacks: {
    onStateChange?: (state: PlayerState) => void
    onStreamReady?: (stream: MediaStream) => void
    onError?: (err: Error) => void
  }) {
    this.onStateChange = callbacks.onStateChange || null
    this.onStreamReady = callbacks.onStreamReady || null
    this.onError = callbacks.onError || null
  }

  private setState(state: PlayerState, error?: Error) {
    this._state = state
    this._error = error || null
    this.onStateChange?.(state)
    if (error) this.onError?.(error)
  }

  private onConnectionStateChange = () => {
    if (!this.pc) return
    const connState = this.pc.connectionState
    switch (connState) {
      case 'connected':
        this.setState('playing')
        break
      case 'disconnected':
      case 'failed':
      case 'closed':
        this.setState('error', new Error(`Connection ${connState}`))
        break
    }
  }

  private onTrack = (ev: RTCTrackEvent) => {
    const track = ev.track
    // Replace existing track of same kind, or add new
    const existing = this.stream.getTracks().find(t => t.kind === track.kind)
    if (existing) {
      this.stream.removeTrack(existing)
    }
    this.stream.addTrack(track)
    this.onStreamReady?.(this.stream)
  }

  async connect(): Promise<void> {
    if (this._state === 'playing' || this._state === 'loading') return

    this.setState('loading')
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.22333.fun' }
      ]
    })
    this.stream = new MediaStream()

    try {
      // Add recvonly transceivers for both audio and video
      this.pc.addTransceiver('video', { direction: 'recvonly' })
      this.pc.addTransceiver('audio', { direction: 'recvonly' })

      this.pc.addEventListener('connectionstatechange', this.onConnectionStateChange)
      this.pc.ontrack = this.onTrack

      await this.client.view(this.pc, this.url)
      this.startWatchdog()
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      // Provide a friendlier message for CORS errors
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        this.setState('error', new Error(
          'Cannot reach Live777 server. If you entered an absolute URL like ' +
          'http://localhost:7777/whep/xxx, try using just /whep/xxx or the ' +
          'stream ID instead.'
        ))
      } else {
        this.setState('error', err)
      }
    }
  }

  async disconnect(): Promise<void> {
    this.stopWatchdog()
    try {
      await this.client.stop()
    } catch {
      // Ignore cleanup errors
    }

    if (this.pc) {
      this.pc.removeEventListener('connectionstatechange', this.onConnectionStateChange)
      this.pc.close()
      this.pc = null
    }

    this.stream.getTracks().forEach(t => t.stop())
    this.stream = new MediaStream()
    this.setState('idle')
  }

  async restart(): Promise<void> {
    await this.disconnect()
    await this.connect()
  }

  // ---- Watchdog ----

  private startWatchdog() {
    if (this.timer) return
    this.timer = setInterval(() => this.runWatchdog(), WATCHDOG_INTERVAL)
  }

  private stopWatchdog() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private runWatchdog() {
    if (!this.pc) return
    const connState = this.pc.connectionState
    if (RESTART_STATES.includes(connState!)) {
      console.warn('[WhepClient] Watchdog restarting...')
      this.restart()
    }
  }
}
