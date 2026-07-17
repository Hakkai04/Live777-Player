import { useCallback } from 'react'
import type { GridMode, StreamProtocol } from '@/types'
import { useChannelManager } from '@/hooks/useChannelManager'
import { useSettingsStore } from '@/store/playerStore'
import { LivePlayer } from './LivePlayer'

interface VideoGridProps {
  activeStreamUrl: string | null
  activeProtocol: StreamProtocol
}

/**
 * Multi-stream grid for displaying multiple cameras simultaneously.
 * Uses the channel store to determine which channels to show.
 * Grid layout is controlled by the settings store (gridMode).
 */
export function VideoGrid({ activeStreamUrl, activeProtocol }: VideoGridProps) {
  const { channels, activeChannelId, switchChannel } = useChannelManager()
  const gridMode = useSettingsStore(s => s.gridMode)

  const gridLimits: Record<GridMode, number> = {
    single: 1,
    '2x2': 4,
    '3x3': 9,
    '4x4': 16
  }

  const maxChannels = gridLimits[gridMode]

  // In grid mode, show active channel first + fill remaining slots
  // from the channel list, up to the grid limit
  const displayedChannels = (() => {
    if (gridMode === 'single') {
      // Single mode: only the active channel (the URL being played)
      const ch = channels.find(c => c.id === activeChannelId)
      return ch ? [ch] : []
    }
    // Grid mode: active channel first, then other channels up to the grid limit
    const others = channels.filter(c => c.id !== activeChannelId)
    const active = channels.find(c => c.id === activeChannelId)
    const result = active ? [active, ...others] : [...others]
    return result.slice(0, maxChannels)
  })()

  const getGridClass = (mode: GridMode): string => {
    switch (mode) {
      case 'single':
        return 'grid-cols-1 grid-rows-1'
      case '2x2':
        return 'grid-cols-2 grid-rows-2'
      case '3x3':
        return 'grid-cols-3 grid-rows-3'
      case '4x4':
        return 'grid-cols-4 grid-rows-4'
      default:
        return 'grid-cols-1 grid-rows-1'
    }
  }

  const handleGridClick = useCallback(
    (channelId: string) => {
      if (channelId !== activeChannelId) {
        switchChannel(channelId)
      }
    },
    [activeChannelId, switchChannel]
  )

  // In single mode, just show the active stream
  if (gridMode === 'single') {
    return (
      <div className="w-full h-full">
        <LivePlayer
          streamUrl={activeStreamUrl}
          streamType={activeProtocol}
          autoPlay
        />
      </div>
    )
  }

  // Grid mode
  return (
    <div className={`grid ${getGridClass(gridMode)} gap-2 w-full h-full p-2`}>
      {displayedChannels.map(channel => {
        const isActive = channel.id === activeChannelId
        return (
          <div
            key={channel.id}
            className={`relative overflow-hidden rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900'
                : 'hover:ring-1 hover:ring-white/30'
            }`}
            onClick={() => handleGridClick(channel.id)}
          >
            <LivePlayer
              streamUrl={channel.url}
              streamType={channel.protocol}
              autoPlay={isActive || displayedChannels.length <= 4}
            />
            {/* Channel label */}
            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-xs text-white/90">
              {channel.name}
            </div>
            {!isActive && (
              <div className="absolute inset-0 bg-black/20 hover:bg-transparent transition-colors" />
            )}
          </div>
        )
      })}

      {/* Empty slots */}
      {displayedChannels.length < maxChannels &&
        Array.from({ length: maxChannels - displayedChannels.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="rounded-lg bg-gray-900/60 border border-dashed border-gray-600/30
              flex items-center justify-center text-white/40 text-sm"
          >
            No stream
          </div>
        ))
      }
    </div>
  )
}
