import { useRef, useEffect, useState, useCallback } from 'react'
import type { PlayerState, StreamProtocol } from '@/types'
import { useWhepPlayer } from '@/hooks/useWhepPlayer'
import { useStreamStats } from '@/hooks/useStreamStats'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useSettingsStore } from '@/store/playerStore'
import { PlayerControls } from './PlayerControls'
import { StreamStats } from './StreamStats'
import { IconLoading, IconError } from './svg/icons'

interface LivePlayerProps {
  streamUrl: string | null
  streamType?: StreamProtocol
  autoPlay?: boolean
}

export function LivePlayer({
  streamUrl,
  streamType = 'whep',
  autoPlay = true
}: LivePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isPaused, setIsPaused] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const settings = useSettingsStore()

  // WHEP connection
  const {
    stream,
    state,
    error,
    pc,
    disconnect,
    restart
  } = useWhepPlayer(streamUrl, autoPlay)

  // Stream statistics
  const stats = useStreamStats(pc, settings.showStats)

  // Fullscreen
  const fullscreen = useFullscreen(containerRef)

  // Wire up MediaStream to video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (stream) {
      video.srcObject = stream
    } else {
      video.srcObject = null
    }
  }, [stream])

  // Auto-mute/unmute based on settings
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = settings.muted
    video.volume = settings.volume / 100
  }, [settings.muted, settings.volume])

  // Play/pause handling
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (state === 'playing' && !isPaused) {
      video.play().catch(() => {
        // Autoplay blocked — user interaction needed
      })
    } else {
      video.pause()
    }
  }, [state, isPaused])

  // Controls auto-hide
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2500)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPaused(p => !p)
          break
        case 'f':
        case 'F':
          fullscreen.toggle()
          break
        case 'm':
        case 'M': {
          const store = useSettingsStore.getState()
          useSettingsStore.setState({ muted: !store.muted })
          break
        }
        case 'Escape':
          if (fullscreen.isFullscreen) fullscreen.exit()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  // Double-tap for fullscreen on mobile
  const handleDoubleClick = useCallback(() => {
    fullscreen.toggle()
  }, [fullscreen])

  // Screenshot
  const takeScreenshot = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/png')

    // Download
    const link = document.createElement('a')
    link.download = `live777-screenshot-${Date.now()}.png`
    link.href = dataUrl
    link.click()
  }, [])

  // Determine what to show
  const showLoading = state === 'loading'
  const showError = state === 'error'
  const showVideo = state === 'playing' || state === 'paused'

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setShowControls(false)}
      onTouchStart={handleMouseMove}
      onClick={handleMouseMove}
      onDoubleClick={handleDoubleClick}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay={autoPlay}
        muted={settings.muted}
        controls={false}
      />

      {/* Hidden canvas for screenshots */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Loading overlay */}
      {showLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <IconLoading className="text-blue-400 w-12 h-12 mb-4" />
          <p className="text-white/70 text-sm">Connecting to stream...</p>
        </div>
      )}

      {/* Error overlay */}
      {showError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <IconError className="text-red-400 w-16 h-16 mb-4" />
          <p className="text-white/80 text-lg font-medium mb-2">Connection Error</p>
          <p className="text-white/50 text-sm mb-4">{error?.message || 'Unknown error'}</p>
          <button
            className="btn-primary"
            onClick={() => restart()}
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Idle state */}
      {state === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <div className="text-white/30 text-6xl mb-4">Live777</div>
          <p className="text-white/40 text-sm">Enter a stream URL to start playback</p>
        </div>
      )}

      {/* Controls (shown on hover/idle) */}
      {showVideo && (
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            showControls || isPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <PlayerControls
            isPaused={isPaused}
            isMuted={settings.muted}
            volume={settings.volume}
            isFullscreen={fullscreen.isFullscreen}
            fullscreenSupported={fullscreen.isSupported}
            pipSupported={'pictureInPictureEnabled' in document}
            onPlayPause={() => setIsPaused(p => !p)}
            onVolumeChange={(v) => useSettingsStore.setState({ volume: v })}
            onMuteToggle={() => useSettingsStore.setState(s => ({ muted: !s.muted }))}
            onFullscreenToggle={fullscreen.toggle}
            onScreenshot={takeScreenshot}
            onStop={disconnect}
          />
        </div>
      )}

      {/* Stats overlay */}
      {showVideo && settings.showStats && (
        <div className="absolute top-0 right-0 m-4">
          <StreamStats stats={stats} connectionState={pc?.connectionState || 'unknown'} />
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && showVideo && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={() => setIsPaused(false)}
        >
          <div className="bg-white/90 rounded-full p-6 shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48" className="text-gray-800">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
