/**
 * WHIP Client wrapper for publishing local camera/microphone to Live777.
 *
 * Lifecycle:
 *   1. Create a new WhipClient with a stream ID
 *   2. Call connect() — requests getUserMedia, sets up RTCPeerConnection,
 *      sends SDP offer via WHIP POST to /whip/{streamId}
 *   3. Local preview stream available via getStream()
 *   4. WHEP playback URL available via getWhepUrl()
 *   5. Call disconnect() when done
 *
 * Connection monitoring: reacts to connectionstatechange events.
 */

import type { PlayerState } from '@/types'
import { createLogger, generateCorrelationId } from './logger'

const log = createLogger('WhipClient')
export class WhipClient {
  private pc: RTCPeerConnection | null = null
  private stream: MediaStream | null = null
  private streamId: string
  private cameraId: string | undefined
  private micId: string | undefined
  private _state: PlayerState = 'idle'
  private _error: Error | null = null
  private _whepUrl: string | null = null
  private corrId: string

  // Callbacks
  private onStateChange: ((state: PlayerState) => void) | null = null
  private onError: ((err: Error) => void) | null = null

  constructor(streamId: string, cameraId?: string, micId?: string) {
    this.streamId = streamId
    this.cameraId = cameraId
    this.micId = micId
    this.corrId = generateCorrelationId()
  }

  get state(): PlayerState {
    return this._state
  }

  get error(): Error | null {
    return this._error
  }

  getStream(): MediaStream | null {
    return this.stream
  }

  getWhepUrl(): string | null {
    return this._whepUrl
  }

  getPeerConnection(): RTCPeerConnection | null {
    return this.pc
  }

  setCallbacks(callbacks: {
    onStateChange?: (state: PlayerState) => void
    onError?: (err: Error) => void
  }) {
    this.onStateChange = callbacks.onStateChange || null
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
	        this.setState('error', new Error(`Connection ${connState ?? 'unknown'}`))
	        break
	      case 'new':
	      case 'connecting':
	        break
	    }
  }

  async connect(): Promise<void> {
    if (this._state === 'playing' || this._state === 'loading') return

    this.setState('loading')
    log.info('Starting WHIP publish', { streamId: this.streamId, corrId: this.corrId })

    try {
      // Request camera + microphone
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: this.cameraId
          ? { deviceId: { exact: this.cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: this.micId
          ? { deviceId: { exact: this.micId } }
          : true
      })

      // Build RTCPeerConnection
      this.pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.22333.fun' }
        ]
      })

      // Add local tracks
      this.stream.getTracks().forEach(track => {
        this.pc!.addTrack(track, this.stream!)
      })

      this.pc.addEventListener('connectionstatechange', this.onConnectionStateChange)

      // Create offer
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete
      await this.waitForIceGathering()

      // Send WHIP POST
      const origin = window.location.origin
      const whipUrl = `${origin}/whip/${this.streamId}`
      const resp = await fetch(whipUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: this.pc.localDescription!.sdp
      })

      if (!resp.ok) {
        throw new Error(`WHIP publish failed: ${String(resp.status)} ${resp.statusText}`)
      }

      // Set remote answer
      const answerSdp = await resp.text()
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      // Build the WHEP playback URL
      this._whepUrl = `/whep/${this.streamId}`
      log.info('WHIP publish successful', { streamId: this.streamId, whepUrl: this._whepUrl, corrId: this.corrId })
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      log.error('WHIP publish failed', err, { streamId: this.streamId, corrId: this.corrId })
      this.setState('error', err)
    }
  }

  async disconnect(): Promise<void> {
    log.info('Stopping WHIP publish', { streamId: this.streamId, corrId: this.corrId })
    try {
      if (this.pc) {
        const origin = window.location.origin
        await fetch(`${origin}/whip/${this.streamId}`, { method: 'DELETE' })
        this.pc.removeEventListener('connectionstatechange', this.onConnectionStateChange)
        this.pc.close()
        this.pc = null
      }
    } catch {
      // Ignore cleanup errors
    }

    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop())
      this.stream = null
    }

    this._whepUrl = null
    this.setState('idle')
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise(resolve => {
      if (!this.pc) { resolve(); return }
      if (this.pc.iceGatheringState === 'complete') { resolve(); return }
      this.pc.onicegatheringstatechange = () => {
        if (this.pc!.iceGatheringState === 'complete') resolve()
      }
    })
  }
}
