import { useState } from 'react'
import { useChannelManager } from '@/hooks/useChannelManager'
import { useSettingsStore, setGridMode } from '@/store/playerStore'
import {
  IconAdd,
  IconClose,
  IconCamera
} from './svg/icons'
import type { StreamProtocol, GridMode } from '@/types'

interface ChannelSwitcherProps {
  onSelectChannel: (url: string, protocol: StreamProtocol) => void
}

export function ChannelSwitcher({ onSelectChannel }: ChannelSwitcherProps) {
  const { channels, activeChannelId, addChannel, removeChannel, switchChannel } = useChannelManager()
  const gridMode = useSettingsStore(s => s.gridMode)

  const handleSetGridMode = (mode: GridMode) => setGridMode(mode)

  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')

  const handleAdd = () => {
    if (!newUrl.trim()) return
    const name = newName.trim() || `Channel ${String(channels.length + 1)}`
    const protocol: StreamProtocol = newUrl.startsWith('rtsp://') ? 'rtsp' : 'whep'
    addChannel(name, newUrl.trim(), protocol)
    setNewName('')
    setNewUrl('')
    setShowAdd(false)
  }

  const handleSelect = (id: string) => {
    const channel = channels.find(c => c.id === id)
    if (!channel) return
    switchChannel(id)
    onSelectChannel(channel.url, channel.protocol)
  }

  const gridModes: { mode: GridMode; label: string }[] = [
    { mode: 'single', label: '1' },
    { mode: '2x2', label: '4' },
    { mode: '3x3', label: '9' },
    { mode: '4x4', label: '16' }
  ]

  return (
    <div className="card bg-base-200/90 backdrop-blur-sm border border-base-content/10 rounded-xl p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80 font-medium text-sm">Channels</h3>
        <div className="flex items-center gap-1">
          {/* Grid mode selector */}
          <div className="flex items-center gap-0.5 mr-2">
            {gridModes.map(({ mode, label }) => (
              <button
                key={mode}
                className={`px-1.5 py-0.5 text-10px rounded transition-colors appearance-none ${
                  gridMode === mode
                    ? 'bg-blue-500/30 text-blue-300'
                    : 'bg-white/10 text-white/55 hover:bg-white/15 hover:text-white/85'
                }`}
                onClick={() => handleSetGridMode(mode)}
                title={`${label} streams`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-ghost btn-square btn-sm"
            onClick={() => setShowAdd(!showAdd)}
            title="Add Channel"
          >
            <IconAdd />
          </button>
        </div>
      </div>

      {/* Add Channel Form */}
      {showAdd && (
        <div className="mb-3 p-3 rounded-lg bg-gray-800/70 border border-gray-600/30">
          <input
            type="text"
            placeholder="Channel name (optional)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 text-sm bg-gray-900/90 border border-gray-600/40 rounded text-white/90 placeholder-white/35 outline-none focus:border-blue-500/60"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            type="text"
            placeholder="WHEP or RTSP URL"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="w-full mb-2 px-2 py-1.5 text-sm bg-gray-900/90 border border-gray-600/40 rounded text-white/90 placeholder-white/35 outline-none focus:border-blue-500/60 font-mono text-xs"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <button className="btn btn-primary text-xs py-1 px-3" onClick={handleAdd}>
              Add
            </button>
            <button
              className="text-white/55 hover:text-white/80 text-xs py-1 px-3"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {channels.length === 0 ? (
          <div className="text-center text-white/50 text-xs py-8">
            No channels added.<br />
            Click + to add a stream.
          </div>
        ) : (
          channels.map(channel => {
            const isActive = channel.id === activeChannelId
            return (
              <div
                key={channel.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                  isActive
                    ? 'bg-blue-500/20 border border-blue-500/30'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
                onClick={() => handleSelect(channel.id)}
              >
                {/* Online indicator */}
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    channel.online ? 'bg-green-400' : 'bg-gray-600'
                  }`}
                />

                {/* Channel icon */}
                <IconCamera className="text-white/50 w-4 h-4 flex-shrink-0" />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${isActive ? 'text-blue-200' : 'text-white/70'}`}>
                    {channel.name}
                  </div>
                  <div className="text-10px text-white/50 truncate font-mono">
                    {channel.protocol.toUpperCase()}
                  </div>
                </div>

                {/* Remove button */}
                <button
                  className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-all"
                  onClick={e => {
                    e.stopPropagation()
                    removeChannel(channel.id)
                  }}
                  title="Remove channel"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
