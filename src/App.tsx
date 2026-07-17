import { useState, useCallback } from 'react'
import type { StreamProtocol, AppMode, GridMode } from '@/types'
import { useChannelManager } from '@/hooks/useChannelManager'
import { useSettingsStore, setGridMode } from '@/store/playerStore'
import { ChannelSwitcher } from '@/components/ChannelSwitcher'
import { UrlInput } from '@/components/UrlInput'
import { VideoGrid } from '@/components/VideoGrid'
import { CameraPublisher } from '@/components/CameraPublisher'
import { IconSwap, IconSettings, IconBroadcast, IconGrid } from '@/components/svg/icons'

type LayoutMode = 'desktop' | 'mobile'

export default function App() {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [streamProtocol, setStreamProtocol] = useState<StreamProtocol>('whep')
  const [showSidebar, setShowSidebar] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [connected, setConnected] = useState(false)
  const [appMode, setAppMode] = useState<AppMode>('play')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const { activeChannel, channels } = useChannelManager()
  const gridMode = useSettingsStore(s => s.gridMode)

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
    setMobileDrawerOpen(false) // auto-close drawer on channel select
  }, [])

  const handleDisconnect = useCallback(() => {
    setConnected(false)
    setStreamUrl(null)
  }, [])

  // ============ Grid Mode Buttons (reusable) ============
  const gridModes: { mode: GridMode; label: string }[] = [
    { mode: 'single', label: '1' },
    { mode: '2x2', label: '4' },
    { mode: '3x3', label: '9' },
    { mode: '4x4', label: '16' }
  ]

  const GridButtons = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-0.5 ${compact ? '' : 'mx-2'}`}>
      {gridModes.map(({ mode, label }) => (
        <button
          key={mode}
          className={`px-1.5 py-0.5 text-10px rounded transition-colors appearance-none ${
            gridMode === mode
              ? 'bg-blue-500/30 text-blue-300'
              : 'bg-white/10 text-white/55 hover:bg-white/15 hover:text-white/85'
          }`}
          onClick={() => setGridMode(mode)}
          title={`${label} stream${label === '1' ? '' : 's'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  // ============ Shared Mode Switcher Button ============
  const ModeSwitch = () => (
    <div className="flex items-center bg-gray-800/60 rounded-lg p-0.5">
      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          appMode === 'play'
            ? 'bg-blue-500/30 text-blue-300 shadow-sm'
            : 'text-white/55 hover:text-white/85'
        }`}
        onClick={() => setAppMode('play')}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path d="M8 5v14l11-7z" />
        </svg>
        Play
      </button>
      <button
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          appMode === 'publish'
            ? 'bg-green-500/30 text-green-300 shadow-sm'
            : 'text-white/55 hover:text-white/85'
        }`}
        onClick={() => setAppMode('publish')}
      >
        <IconBroadcast className="w-3.5 h-3.5" />
        Publish
      </button>
    </div>
  )

  // ============ Mobile Layout ============
  if (layoutMode === 'mobile') {
    return (
      <div className="h-full flex flex-col bg-[#0b1121]">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-900/80 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold text-lg">Live777</span>
            <span className="text-white/50 text-sm hidden xs:inline">Player</span>
          </div>
          <div className="flex items-center gap-1">
            <ModeSwitch />
            {appMode === 'play' && (
              <button
                className="btn-icon"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                title="Channels"
              >
                <IconSwap />
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

        {/* Publish mode */}
        {appMode === 'publish' ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <CameraPublisher />
          </div>
        ) : (
          /* Play mode */
          <div className="flex-1 flex flex-col min-h-0">
            {/* URL Input when not connected */}
            {!connected && (
              <div className="px-3 py-3">
                <UrlInput onConnect={handleConnect} />
              </div>
            )}

            {/* Grid mode bar (visible when connected) */}
            {connected && (
              <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900/40 border-b border-gray-800/50">
                <span className="text-white/60 text-10px uppercase tracking-wider">
                  {activeChannel?.name || 'Stream'}
                </span>
                <GridButtons compact />
              </div>
            )}

            {/* Main player area — use VideoGrid for grid support */}
            <div className="flex-1 min-h-0">
              {connected && streamUrl ? (
                <VideoGrid
                  activeStreamUrl={streamUrl}
                  activeProtocol={streamProtocol}
                />
              ) : !connected && (
                <div className="flex items-center justify-center h-full px-6">
                  <div className="text-center max-w-xs">
                    <IconGrid className="text-white/20 w-16 h-16 mx-auto mb-4" />
                    <p className="text-white/55 text-sm mb-2">
                      Enter a stream URL to start playback
                    </p>
                    {channels.length > 0 ? (
                      <button
                        className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                        onClick={() => setMobileDrawerOpen(true)}
                      >
                        Or tap <span className="underline">Channels</span> to pick a saved stream
                      </button>
                    ) : (
                      <p className="text-white/35 text-xs">
                        Add channels in the bottom panel for quick access
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom channel drawer — expandable slide-up panel */}
            <div
              className={`border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm transition-all duration-300 overflow-hidden flex-shrink-0 ${
                mobileDrawerOpen ? 'h-52' : 'h-9'
              }`}
            >
              {/* Drawer handle */}
              <button
                className="w-full flex items-center justify-center py-1.5 text-white/50 hover:text-white/80"
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              >
                <div className="w-8 h-1 bg-white/20 rounded-full mr-2" />
                <span className="text-10px">
                  Channels {mobileDrawerOpen ? '' : `(${channels.length})`}
                </span>
              </button>
              {mobileDrawerOpen && (
                <div className="h-[calc(100%-28px)]">
                  <ChannelSwitcher onSelectChannel={handleSelectChannel} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowSettings(false)}>
            <div className="panel p-6 m-4 max-w-sm w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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

  // ============ Desktop Layout ============
  return (
    <div className="h-full flex bg-[#0b1121]">
      {/* Left sidebar: Channels (only in Play mode) */}
      {showSidebar && appMode === 'play' && (
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
          <div className="flex items-center gap-3">
            {!showSidebar && appMode === 'play' && (
              <button
                className="btn-icon"
                onClick={() => setShowSidebar(true)}
                title="Show channels"
              >
                <IconSwap />
              </button>
            )}
            {appMode === 'play' && (
              <>
                {connected && activeChannel && (
                  <span className="text-white/80 text-sm">{activeChannel.name}</span>
                )}
                <GridButtons />
              </>
            )}
            <ModeSwitch />
          </div>
          <div className="flex items-center gap-2">
            {appMode === 'play' && connected && (
              <button
                className="text-white/60 hover:text-red-400 text-sm px-3 py-1 rounded hover:bg-red-500/10 transition-colors"
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
        {appMode === 'publish' ? (
          <div className="flex-1 min-h-0">
            <CameraPublisher />
          </div>
        ) : (
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
                    <div className="text-6xl text-white/20 font-bold mb-3">Live777</div>
                    <p className="text-white/45 text-sm">
                      Standalone Player — WebRTC/WHEP &amp; RTSP
                    </p>
                    <p className="text-white/35 text-xs mt-2">
                      Add channels from the sidebar or enter a URL above
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
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
        <label className="text-white/65 text-xs block mb-1">Default Volume</label>
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
        <label className="text-white/65 text-xs">Auto Play</label>
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
        <label className="text-white/65 text-xs">Show Stream Stats</label>
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
        <label className="text-white/65 text-xs block mb-1">Default Grid Mode</label>
        <select
          value={settings.gridMode}
          onChange={e => useSettingsStore.setState({ gridMode: e.target.value as any })}
          className="w-full px-3 py-2 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm
            focus:outline-none focus:border-blue-500/60"
        >
          <option value="single">Single</option>
          <option value="2x2">2×2 (4 streams)</option>
          <option value="3x3">3×3 (9 streams)</option>
          <option value="4x4">4×4 (16 streams)</option>
        </select>
      </div>

      {/* Buffering */}
      <div>
        <label className="text-white/65 text-xs block mb-1">Buffering Strategy</label>
        <select
          value={settings.buffering}
          onChange={e => useSettingsStore.setState({ buffering: e.target.value as any })}
          className="w-full px-3 py-2 bg-gray-900/90 border border-gray-600/40 rounded-lg text-white/90 text-sm
            focus:outline-none focus:border-blue-500/60"
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
