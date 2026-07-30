import { useState } from 'react'
import {
  IconPlay,
  IconPause,
  IconStop,
  IconVolume,
  IconVolumeMute,
  IconFullscreen,
  IconFullscreenExit,
  IconPictureInPicture,
  IconScreenshot
} from './svg/icons'

interface PlayerControlsProps {
  isPaused: boolean
  isMuted: boolean
  volume: number
  isFullscreen: boolean
  fullscreenSupported: boolean
  pipSupported: boolean
  onPlayPause: () => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
  onFullscreenToggle: () => void
  onScreenshot: () => void
  onStop: () => void
}

export function PlayerControls({
  isPaused,
  isMuted,
  volume,
  isFullscreen,
  fullscreenSupported,
  pipSupported,
  onPlayPause,
  onVolumeChange,
  onMuteToggle,
  onFullscreenToggle,
  onScreenshot,
  onStop
}: PlayerControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)

  return (
    <div className="bg-gradient-to-t from-black/80 to-transparent px-3 py-4 pt-10">
      <div className="flex items-center justify-between">
        {/* Left: Play/Pause + Stop */}
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onPlayPause}
            title={isPaused ? 'Play' : 'Pause'}
          >
            {isPaused ? <IconPlay /> : <IconPause />}
          </button>
          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={onStop}
            title="Stop"
          >
            <IconStop />
          </button>
          {pipSupported && (
            <button
              className="btn btn-ghost btn-square btn-sm"
              onClick={async () => {
                try {
                  const video = document.querySelector('video')
                  if (!video) return
                  if (document.pictureInPictureElement) {
                    await document.exitPictureInPicture()
                  } else {
                    await video.requestPictureInPicture()
                  }
                } catch { /* unsupported */ }
              }}
              title="Picture in Picture"
            >
              <IconPictureInPicture />
            </button>
          )}
        </div>

        {/* Right: Volume, Screenshot, Fullscreen */}
        <div className="flex items-center gap-1">
          {/* Volume */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <button
              className="btn btn-ghost btn-square btn-sm"
              onClick={onMuteToggle}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <IconVolumeMute /> : <IconVolume />}
            </button>

            {/* Volume Slider */}
            <div
              className={`overflow-hidden transition-all duration-200 ${
                showVolumeSlider ? 'w-20 opacity-100 ml-1' : 'w-0 opacity-0'
              }`}
            >
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  onVolumeChange(v)
                  if (v > 0 && isMuted) onMuteToggle()
                }}
                className="w-full h-1.5 bg-white/30 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>

            {/* Volume percentage */}
            <span className="text-white/80 text-xs w-8 text-right select-none font-medium">
              {isMuted ? 'M' : String(volume)}
            </span>
          </div>

          {/* Screenshot */}
          <button className="btn btn-ghost btn-square btn-sm" onClick={onScreenshot} title="Screenshot">
            <IconScreenshot />
          </button>

          {/* Fullscreen */}
          {fullscreenSupported && (
            <button
              className="btn btn-ghost btn-square btn-sm"
              onClick={onFullscreenToggle}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
