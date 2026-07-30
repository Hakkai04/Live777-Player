import { useCallback } from 'react'
import { useChannelStore } from '@/store/playerStore'
import type { Channel, StreamProtocol } from '@/types'

/**
 * Hook wrapping the Zustand ChannelStore with convenience methods.
 */
export function useChannelManager() {
  const channels = useChannelStore(s => s.channels)
  const activeChannelId = useChannelStore(s => s.activeChannelId)
  const _addChannel = useChannelStore(s => s.addChannel)
  const _updateChannel = useChannelStore(s => s.updateChannel)
  const _removeChannel = useChannelStore(s => s.removeChannel)
  const _setActiveChannel = useChannelStore(s => s.setActiveChannel)

  const activeChannel = channels.find(c => c.id === activeChannelId) || null

  const addChannel = useCallback(
    (name: string, url: string, protocol: StreamProtocol = 'whep') => {
      const id = generateChannelId()
      const channel: Channel = {
        id,
        name,
        url,
        protocol,
        online: false,
        addedAt: Date.now()
      }
      _addChannel(channel)
      // Auto-select if this is the first channel
      if (!activeChannelId) {
        _setActiveChannel(id)
      }
      return id
    },
    [_addChannel, _setActiveChannel, activeChannelId]
  )

  const removeChannel = useCallback(
    (id: string) => {
      _removeChannel(id)
    },
    [_removeChannel]
  )

  const setOnline = useCallback(
    (id: string, online: boolean) => {
      _updateChannel(id, { online })
    },
    [_updateChannel]
  )

  const switchChannel = useCallback(
    (id: string) => {
      _setActiveChannel(id)
    },
    [_setActiveChannel]
  )

  return {
    channels,
    activeChannel,
    activeChannelId,
    addChannel,
    removeChannel,
    setOnline,
    switchChannel
  }
}

function generateChannelId(): string {
  return `ch-${String(Date.now())}-${Math.random().toString(36).slice(2, 8)}`
}
