import { useState, useCallback } from 'react'
import type { StreamProtocol } from '@/types'
import { useChannelManager } from '@/hooks/useChannelManager'
import { useSettingsStore } from '@/store/playerStore'
import { LivePlayer } from '@/components/LivePlayer'
import { ChannelSwitcher } from '@/components/ChannelSwitcher'
import { UrlInput } from '@/components/UrlInput'
import { VideoGrid } from '@/components/VideoGrid'
import { IconSwap, IconSettings } from '@/components/svg/icons'

type LayoutMode = 'desktop' | 'mobile'

export default function App() {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [streamProtocol, setStreamProtocol] = useState<StreamProtocol>('whep')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [connected, setConnected] = useState(false)
  const { activeChannel } = useChannelManager()
  const settings = useSettingsStore()

  // Detect screen size for layout
  const layoutMode: LayoutMode =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'

  const handleConnect = useCallback((url: string, protocol: StreamProtocol) => {
    setStreamUrl(url)
    setStreamProtocol(protocol)
    setConnected(true)
  }, [])

  const handleSelectChannel = useCallback((url: string, protocol: StreamProtocol) => {
    setStreamUrl(url)
    setStreamProtocol(protocol)
    setConnected(true)
  }, [])

  const handleDisconnect = useCallback(() => {
    setConnected(false)
    setStreamUrl(null)
  }, [])

  // Mobile layout
  if (layoutMode === 'mobile') {
    return (
      <div className="h-full flex flex-col bg-[#0b1121]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900/80 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold text-lg">Live777</span>
            <span className="text-white/30 text-sm">Player</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              className="btn-icon"
              onClick={() => setShowSidebar(!showSidebar)}
              title="Channels"
            >
              <IconSwap />
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <IconSettings />
            </button>
          </div>
        </div>

        {/* URL Input (compact) */}
        {!connected && (
          <div className="px-3 py-3">
            <UrlInput onConnect={handleConnect} />
          </div>
        )}

        {/* Main player area */}
        <div className="flex-1 min-h-0">
          {connected && streamUrl ? (
            <LivePlayer
              streamUrl={streamUrl}
              streamType={streamProtocol}
              autoPlay
            />
          ) : !connected && (
            <div className="flex items-center justify-center h-full text-white/20 text-sm">
              Enter a stream URL to begin
            </div>
          )}
        </div>

        {/* Bottom channel tabs (mobile) */}
        {showSidebar && (
          <div className="h-32 border-t border-gray-800 overflow-hidden">
            <ChannelSwitcher onSelectChannel={handleSelectChannel} />
          </div>
        )}

        {/* Settings modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
            <div className="panel p-6 m-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <h3 className="text-white/80 font-medium mb-4">Settings</h3>
              <SettingsPanel />
              <button className="btn-primary w-full mt-4" onClick={() => setShowSettings(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="h-full flex bg-[#0b1121]">
      {/* Left sidebar: Channels */}
      {showSidebar && (
        <div className="w-72 flex-shrink-0 border-r border-gray-800 overflow-y-auto">
          <div className="p-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-bold text-lg">Live777</span>
              <span className="text-white/30 text-sm">Player</span>
            </div>
            <button
              className="btn-icon"
              onClick={() => setShowSidebar(false)}
              title="Hide sidebar"
            >
              <IconSwap />
            </button>
          </div>
          <ChannelSwitcher onSelectChannel={handleSelectChannel} />
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800">
          <div className="flex items-center gap-2">
            {!showSidebar && (
              <button
                className="btn-icon"
                onClick={() => setShowSidebar(true)}
                title="Show channels"
              >
                <IconSwap />
              </button>
            )}
            {connected && activeChannel && (
              <span className="text-white/80 text-sm">{activeChannel.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {connected && (
              <button
                className="text-white/50 hover:text-red-400 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition-colors"
                onClick={handleDisconnect}
              >
                Disconnect
              </button>
            )}
            <button
              className="btn-icon"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <IconSettings />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* URL Input (when not connected) */}
          {!connected && (
            <div className="px-4 py-6">
              <UrlInput onConnect={handleConnect} />
            </div>
          )}

          {/* Player */}
          <div className="flex-1 min-h-0">
            {connected && streamUrl ? (
              <VideoGrid
                activeStreamUrl={streamUrl}
                activeProtocol={streamProtocol}
              />
            ) : !connected && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl text-white/10 font-bold mb-3">Live777</div>
                  <p className="text-white/20 text-sm">
                    Standalone Player — WebRTC/WHEP & RTSP
                  </p>
                  <p className="text-white/10 text-xs mt-2">
                    Add channels from the sidebar or enter a URL above
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
          <div className="panel p-6 m-4 w-96 max-w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-white/80 font-medium mb-4">Settings</h3>
            <SettingsPanel />
            <button className="btn-primary w-full mt-4" onClick={() => setShowSettings(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Settings panel used in both mobile modal and desktop modal */
function SettingsPanel() {
  const settings = useSettingsStore()

  return (
    <div className="space-y-4">
      {/* Volume */}
      <div>
        <label className="text-white/50 text-xs block mb-1">Default Volume</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={e => useSettingsStore.setState({ volume: parseInt(e.target.value) })}
            className="flex-1"
          />
          <span className="text-white/60 text-xs w-8">{settings.volume}</span>
        </div>
      </div>

      {/* Auto Play */}
      <div className="flex items-center justify-between">
        <label className="text-white/50 text-xs">Auto Play</label>
        <button
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.autoPlay ? 'bg-blue-500' : 'bg-gray-600'
          }`}
          onClick={() => useSettingsStore.setState({ autoPlay: !settings.autoPlay })}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full transition-transform m-0.5 ${
              settings.autoPlay ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Show Stats */}
      <div className="flex items-center justify-between">
        <label className="text-white/50 text-xs">Show Stream Stats</label>
        <button
          className={`w-10 h-5 rounded-full transition-colors ${
            settings.showStats ? 'bg-blue-500' : 'bg-gray-600'
          }`}
          onClick={() => useSettingsStore.setState({ showStats: !settings.showStats })}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full transition-transform m-0.5 ${
              settings.showStats ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {/* Grid Mode */}
      <div>
        <label className="text-white/50 text-xs block mb-1">Default Grid Mode</label>
        <select
          value={settings.gridMode}
          onChange={e => useSettingsStore.setState({ gridMode: e.target.value as any })}
          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white/80 text-sm
            focus:outline-none focus:border-blue-500/50"
        >
          <option value="single">Single</option>
          <option value="2x2">2×2 (4 streams)</option>
          <option value="3x3">3×3 (9 streams)</option>
          <option value="4x4">4×4 (16 streams)</option>
        </select>
      </div>

      {/* Buffering */}
      <div>
        <label className="text-white/50 text-xs block mb-1">Buffering Strategy</label>
        <select
          value={settings.buffering}
          onChange={e => useSettingsStore.setState({ buffering: e.target.value as any })}
          className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white/80 text-sm
            focus:outline-none focus:border-blue-500/50"
        >
          <option value="auto">Auto</option>
          <option value="low">Low Latency</option>
          <option value="normal">Normal</option>
          <option value="high">Smooth</option>
        </select>
      </div>
    </div>
  )
}
