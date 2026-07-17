import { useState, useRef, useEffect, useCallback } from 'react'
import { useWhipPublisher } from '@/hooks/useWhipPublisher'
import { IconBroadcast, IconCopy, IconLoading, IconError, IconClose } from './svg/icons'

interface DeviceInfo {
  deviceId: string
  label: string
}

interface CameraPublisherProps {
  onCopied?: () => void
}

export function CameraPublisher({ onCopied }: CameraPublisherProps) {
  const [streamId, setStreamId] = useState('my-camera')
  const [cameras, setCameras] = useState<DeviceInfo[]>([])
  const [mics, setMics] = useState<DeviceInfo[]>([])
  const [cameraId, setCameraId] = useState('')
  const [micId, setMicId] = useState('')
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const previewRef = useRef<HTMLVideoElement>(null)

  const { stream, state, error, whepUrl, connect, disconnect } = useWhipPublisher({
    streamId: activeStreamId,
    cameraId: cameraId || undefined,
    micId: micId || undefined
  })

  // Load device list (request permission first)
  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async () => {
    try {
      // Request permission to get device labels
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      tempStream.getTracks().forEach(t => t.stop())
    } catch {
      // Permission denied — still enumerate but labels may be generic
    }
    const devices = await navigator.mediaDevices.enumerateDevices()
    setCameras(
      devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }))
    )
    setMics(
      devices
        .filter(d => d.kind === 'audioinput')
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Mic ${i + 1}` }))
    )
  }

  // Wire MediaStream to preview <video>
  useEffect(() => {
    const video = previewRef.current
    if (!video) return
    if (stream) {
      video.srcObject = stream
    } else {
      video.srcObject = null
    }
  }, [stream])

  const handleStart = useCallback(() => {
    const id = streamId.trim()
    if (!id) return
    setActiveStreamId(id)
    // connect() will be called by the hook on streamId change
    // We need to trigger it manually since we don't use autoConnect
    setTimeout(() => connect(), 0)
  }, [streamId, connect])

  const handleStop = useCallback(() => {
    disconnect()
    setActiveStreamId(null)
  }, [disconnect])

  // Call connect when activeStreamId changes (but only once)
  const didConnectRef = useRef(false)
  useEffect(() => {
    if (activeStreamId && !didConnectRef.current) {
      didConnectRef.current = true
      connect()
    }
    if (!activeStreamId) {
      didConnectRef.current = false
    }
  }, [activeStreamId, connect])

  const handleCopy = useCallback(async () => {
    if (!whepUrl) return
    try {
      await navigator.clipboard.writeText(whepUrl)
      setCopied(true)
      onCopied?.()
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for non-HTTPS contexts
      const ta = document.createElement('textarea')
      ta.value = whepUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [whepUrl, onCopied])

  const isPublishing = state === 'playing' || state === 'loading'
  const isLoading = state === 'loading'
  const hasError = state === 'error'

  // Status badge
  const statusInfo: Record<string, { color: string; text: string }> = {
    idle: { color: 'bg-gray-500', text: 'Idle' },
    loading: { color: 'bg-yellow-500', text: 'Connecting...' },
    playing: { color: 'bg-green-500', text: 'Publishing' },
    error: { color: 'bg-red-500', text: 'Error' }
  }
  const status = statusInfo[state] || statusInfo.idle

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full p-3 lg:p-6 overflow-y-auto">
      {/* Controls panel */}
      <div className="flex-shrink-0 lg:w-80 space-y-3">
        {/* Stream ID */}
        <div>
          <label className="text-white/65 text-xs block mb-1">Stream ID</label>
          <input
            type="text"
            value={streamId}
            onChange={e => setStreamId(e.target.value)}
            disabled={isPublishing}
            placeholder="my-camera"
            className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm
              outline-none focus:border-blue-500/60 font-mono disabled:opacity-40"
          />
        </div>

        {/* Camera selection */}
        <div>
          <label className="text-white/65 text-xs block mb-1">Camera</label>
          <select
            value={cameraId}
            onChange={e => setCameraId(e.target.value)}
            disabled={isPublishing}
            className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm
              outline-none focus:border-blue-500/60 disabled:opacity-40"
          >
            <option value="">Default Camera</option>
            {cameras.map(c => (
              <option key={c.deviceId} value={c.deviceId}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Microphone selection */}
        <div>
          <label className="text-white/65 text-xs block mb-1">Microphone</label>
          <select
            value={micId}
            onChange={e => setMicId(e.target.value)}
            disabled={isPublishing}
            className="w-full px-3 py-2.5 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm
              outline-none focus:border-blue-500/60 disabled:opacity-40"
          >
            <option value="">Default Microphone</option>
            {mics.map(m => (
              <option key={m.deviceId} value={m.deviceId}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {!isPublishing ? (
            <button
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
              onClick={handleStart}
              disabled={!streamId.trim()}
            >
              <IconBroadcast className="w-4 h-4" />
              Start Publishing
            </button>
          ) : (
            <button
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors duration-200"
              onClick={handleStop}
            >
              <IconClose className="w-4 h-4" />
              Stop Publishing
            </button>
          )}
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-3 panel px-4 py-3">
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${status.color} ${isLoading ? 'animate-pulse' : ''}`} />
          <span className="text-white/80 text-sm font-medium">{status.text}</span>
        </div>

        {/* Error message */}
        {hasError && error && (
          <div className="panel px-4 py-3 border-red-500/30">
            <div className="flex items-start gap-2">
              <IconError className="text-red-400 w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-sm font-medium">Publish Error</p>
                <p className="text-red-300/70 text-xs mt-0.5">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* WHEP URL display */}
        {whepUrl && (
          <div className="panel px-4 py-4 space-y-3">
            <p className="text-white/70 text-xs">
              Stream is live! Others can play it with this URL:
            </p>
            <div className="bg-black/60 rounded-lg px-3 py-2 font-mono text-sm text-green-400 break-all select-all">
              {whepUrl}
            </div>
            <button
              className="flex items-center gap-2 w-full justify-center py-2 px-4
                bg-green-600/80 text-white text-sm font-medium rounded-lg
                hover:bg-green-600 transition-colors duration-200"
              onClick={handleCopy}
            >
              <IconCopy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Playback URL'}
            </button>
            <p className="text-white/55 text-xs text-center">
              Switch to <strong>Play</strong> mode and paste this URL to view your stream
            </p>
          </div>
        )}
      </div>

      {/* Right panel: Preview */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="relative flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center min-h-64">
          {/* Video preview */}
          <video
            ref={previewRef}
            className="w-full h-full object-contain"
            autoPlay
            playsInline
            muted
          />

          {/* Idle overlay */}
          {!isPublishing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
              <IconBroadcast className="text-white/25 w-16 h-16 mb-3" />
              <p className="text-white/55 text-sm">Camera preview will appear here</p>
              <p className="text-white/40 text-xs mt-1">
                Select devices and click "Start Publishing"
              </p>
            </div>
          )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
              <IconLoading className="text-blue-400 w-10 h-10 mb-3" />
              <p className="text-white/70 text-sm">Connecting to Live777...</p>
            </div>
          )}
        </div>

        {/* Publishing indicator */}
        {isPublishing && (
          <div className="mt-2 flex items-center gap-2 text-xs text-white/55 px-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Recording from camera
          </div>
        )}
      </div>
    </div>
  )
}
