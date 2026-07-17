import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Channel, PlayerSettings, GridMode } from '@/types'

// ============ Player Settings Store ============

const defaultSettings: PlayerSettings = {
  volume: 80,
  muted: false,
  autoPlay: true,
  showStats: true,
  gridMode: 'single',
  buffering: 'auto'
}

export const useSettingsStore = create<PlayerSettings>()(
  persist(
    (_set) => defaultSettings,
    { name: 'player-settings' }
  )
)

// Set individual settings
export function setVolume(volume: number) {
  useSettingsStore.setState({ volume: Math.max(0, Math.min(100, volume)) })
}

export function toggleMute() {
  useSettingsStore.setState(s => ({ muted: !s.muted }))
}

export function setShowStats(showStats: boolean) {
  useSettingsStore.setState({ showStats })
}

export function setGridMode(gridMode: GridMode) {
  useSettingsStore.setState({ gridMode })
}

// ============ Channel Store ============

interface ChannelStore {
  channels: Channel[]
  activeChannelId: string | null

  addChannel: (channel: Channel) => void
  updateChannel: (id: string, updates: Partial<Channel>) => void
  removeChannel: (id: string) => void
  setActiveChannel: (id: string) => void
  reorderChannels: (fromIndex: number, toIndex: number) => void
  getChannel: (id: string) => Channel | undefined
}

export const useChannelStore = create<ChannelStore>()(
  persist(
    (set, get) => ({
      channels: [],
      activeChannelId: null,

      addChannel: (channel) =>
        set(s => ({ channels: [...s.channels, channel] })),

      updateChannel: (id, updates) =>
        set(s => ({
          channels: s.channels.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
        })),

      removeChannel: (id) =>
        set(s => ({
          channels: s.channels.filter(c => c.id !== id),
          activeChannelId: s.activeChannelId === id ? null : s.activeChannelId
        })),

      setActiveChannel: (id) =>
        set({ activeChannelId: id }),

      reorderChannels: (fromIndex: number, toIndex: number) =>
        set(s => {
          const channels = [...s.channels]
          const [removed] = channels.splice(fromIndex, 1)
          channels.splice(toIndex, 0, removed)
          return { channels }
        }),

      getChannel: (id) => get().channels.find(c => c.id === id)
    }),
    { name: 'player-channels' }
  )
)

// ============ Player State Store (ephemeral, not persisted) ============

interface PlayerStateStore {
  playerState: import('@/types').PlayerState
  error: string | null
  stats: import('@/types').StreamStats | null

  setPlayerState: (playerState: import('@/types').PlayerState) => void
  setError: (error: string | null) => void
  setStats: (stats: import('@/types').StreamStats | null) => void
}

export const usePlayerStateStore = create<PlayerStateStore>()(
  (set) => ({
    playerState: 'idle',
    error: null,
    stats: null,

    setPlayerState: (playerState) => set({ playerState }),
    setError: (error) => set({ error }),
    setStats: (stats) => set({ stats })
  })
)
