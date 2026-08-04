import { useRef, useEffect, useState, useCallback } from 'react'
import type { StreamProtocol } from '@/types'
import { useWhepPlayer } from '@/hooks/useWhepPlayer'
import { useStreamStats } from '@/hooks/useStreamStats'
import { useFullscreen } from '@/hooks/useFullscreen'
import { useSettingsStore } from '@/store/playerStore'
import { useChannelManager } from '@/hooks/useChannelManager'
import { PlayerControls } from './PlayerControls'
import { StreamStats } from './StreamStats'
import { IconLoading, IconError } from './svg/icons'

interface LivePlayerProps {
  streamUrl: string | null
  streamType?: StreamProtocol
  autoPlay?: boolean
  /** Channel ID for online status tracking */
  channelId?: string
}

export function LivePlayer({
  streamUrl,
  autoPlay = true,
  channelId
}: LivePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isPaused, setIsPaused] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showHint, setShowHint] = useState(true)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const lastTapRef = useRef(0)

  const settings = useSettingsStore()
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  // WHEP connection
  const {
    stream,
    state,
    error,
    pc,
    disconnect,
    restart
  } = useWhepPlayer(streamUrl, autoPlay)

  // Stream statistics (poll even if hidden, so stats are ready when shown)
  const stats = useStreamStats(pc, settings.showStats || (isMobile && showControls))

  // Fullscreen
  const fullscreen = useFullscreen(containerRef)

  // Channel online status (fixes gap: online indicator was never updated)
  const { setOnline } = useChannelManager()

  // Auto-mark channel as online when playing, offline on disconnect
  useEffect(() => {
    if (channelId) {
      setOnline(channelId, state === 'playing')
    }
  }, [state, channelId, setOnline])

  // Apply buffering strategy to video receiver playoutDelayHint
  // Fixes gap: buffering setting was stored but never applied
  useEffect(() => {
    if (!pc || settings.buffering === 'auto') return
    const delays: Record<string, number> = { low: 0.1, normal: 0.5, high: 2.0 }
    const delay = delays[settings.buffering]
    if (delay === undefined) return
    for (const receiver of pc.getReceivers()) {
      if (receiver.track.kind === 'video' && 'playoutDelayHint' in receiver) {
        try {
          ;(receiver as { playoutDelayHint?: number }).playoutDelayHint = delay
        } catch { /* not supported */ }
      }
    }
  }, [pc, settings.buffering])

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

  // Show hint on first play, auto-hide after 4 seconds
  useEffect(() => {
    const videoActive = state === 'playing' || state === 'paused'
    if (videoActive) {
      setShowHint(true)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
      hintTimerRef.current = setTimeout(() => setShowHint(false), 4500)
    } else {
      setShowHint(false)
    }
    return () => { if (hintTimerRef.current) clearTimeout(hintTimerRef.current) }
  }, [state, streamUrl])

  // On mobile: show controls & stats when entering fullscreen, hide when exiting
  useEffect(() => {
    if (isMobile) {
      if (fullscreen.isFullscreen) {
        setShowControls(true)
        resetHideTimer()
      } else {
        setShowControls(false)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      }
    }
  }, [fullscreen.isFullscreen, isMobile])

  // Controls auto-hide timer
  const resetHideTimer = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => {
      setShowControls(false)
    }, 2500)
  }, [])

  // ============ Desktop: hover to show controls ============
  const handleMouseMove = useCallback(() => {
    if (isMobile) return // mobile handles differently
    setShowControls(true)
    resetHideTimer()
  }, [isMobile, resetHideTimer])

  // ============ Mobile: tap handling (single vs double) ============
  const handleMobileTap = useCallback(() => {
    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current
    lastTapRef.current = now

    if (timeSinceLastTap < 350 && fullscreen.isSupported) {
      // Double tap → toggle fullscreen
      void fullscreen.toggle()
      return
    }

    // Toggle controls:
    //   - Fullscreen supported & active → toggle
    //   - Fullscreen NOT supported (iOS) → toggle on single tap
    if (!fullscreen.isSupported || fullscreen.isFullscreen) {
      if (showControls) {
        setShowControls(false)
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
      } else {
        setShowControls(true)
        resetHideTimer()
      }
    }
  }, [fullscreen, showControls, resetHideTimer])

  // ============ Keyboard shortcuts ============
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setIsPaused(p => !p)
          break
        case 'f':
        case 'F':
          void fullscreen.toggle()
          break
        case 'm':
        case 'M': {
          const store = useSettingsStore.getState()
          useSettingsStore.setState({ muted: !store.muted })
          break
        }
        case 'Escape':
          if (fullscreen.isFullscreen) void fullscreen.exit()
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  // ============ Screenshot ============
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
    link.download = `live777-screenshot-${String(Date.now())}.png`
    link.href = dataUrl
    link.click()
  }, [])

  // Determine what to show
  const showLoading = state === 'loading'
  const showError = state === 'error'
  const showVideo = state === 'playing' || state === 'paused'

  // Controls visibility:
  //   Desktop: hover/show on mouse move, always show when paused
  //   Mobile:  only in fullscreen (or on tap if fullscreen unsupported)
  const controlsVisible = isMobile
    ? (fullscreen.isSupported ? (showControls && fullscreen.isFullscreen) : showControls)
    : showControls || isPaused

  // Stats visibility:
  //   Desktop: when settings.showStats
  //   Mobile:  only with controls (fullscreen or iOS tap)
  const statsVisible = isMobile ? controlsVisible : settings.showStats

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => !isMobile && setShowControls(false)}
      onTouchStart={() => {}} // required for iOS to make the element tappable
      onClick={() => isMobile ? handleMobileTap() : handleMouseMove()}
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
          <IconLoading className="text-blue-400 w-10 h-10 lg:w-12 lg:h-12 mb-4" />
          <p className="text-white/70 text-sm">Connecting to stream...</p>
        </div>
      )}

      {/* Error overlay */}
      {showError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <IconError className="text-red-400 w-12 h-12 lg:w-16 lg:h-16 mb-4" />
          <p className="text-white/80 text-base lg:text-lg font-medium mb-2">Connection Error</p>
          <p className="text-white/65 text-sm mb-4">{error?.message || 'Unknown error'}</p>
          <button
            className="btn btn-primary"
            onClick={() => restart()}
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Idle state */}
      {state === 'idle' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
          <div className="text-white/25 text-4xl lg:text-6xl mb-4">Live777</div>
          <p className="text-white/55 text-sm">Enter a stream URL to start playback</p>
        </div>
      )}

      {/* Controls */}
      {showVideo && (
        <div
          className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
      {showVideo && statsVisible && (
        <div className="absolute top-0 right-0 m-2 lg:m-4">
          <StreamStats stats={stats} connectionState={pc?.connectionState || 'unknown'} />
        </div>
      )}

      {/* Pause indicator */}
      {isPaused && showVideo && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={() => setIsPaused(false)}
        >
          <div className="bg-white/90 rounded-full p-4 lg:p-6 shadow-lg">
            <svg viewBox="0 0 24 24" fill="currentColor" width="40" height="40" className="text-gray-800 lg:w-12 lg:h-12">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mobile hint overlay (shown briefly when not in fullscreen) */}
      {isMobile && showVideo && !fullscreen.isFullscreen && showHint && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-500">
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-5 py-2.5">
            {fullscreen.isSupported ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" width="18" height="18" className="mx-auto mb-1">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" fill="white" />
                </svg>
                <p className="text-white/70 text-10px text-center">Double-tap for fullscreen</p>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="white" width="18" height="18" className="mx-auto mb-1">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <p className="text-white/70 text-10px text-center">Tap to show controls</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
