import { useState, useRef, useEffect } from 'react'
import type { StreamProtocol } from '@/types'
import { getUrlHistory, addUrlToHistory } from '@/lib/storage'
import { IconLink, IconClose } from './svg/icons'

interface UrlInputProps {
  onConnect: (url: string, protocol: StreamProtocol) => void
  disabled?: boolean
}

export function UrlInput({ onConnect, disabled = false }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [protocol, setProtocol] = useState<StreamProtocol>('whep')
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Load history on mount
  useEffect(() => {
    setHistory(getUrlHistory())
  }, [])

  // Close history on click outside
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Auto-detect protocol from URL
  const detectProtocol = (input: string): StreamProtocol => {
    if (input.startsWith('rtsp://')) return 'rtsp'
    if (input.startsWith('rtsps://')) return 'rtsp'
    return 'whep'
  }

  const handleSubmit = () => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return

    const detectedProtocol = detectProtocol(trimmedUrl)
    addUrlToHistory(trimmedUrl)
    setHistory(getUrlHistory())

    onConnect(trimmedUrl, detectedProtocol)
    setShowHistory(false)
  }

  const handleSelectHistory = (historyUrl: string) => {
    setUrl(historyUrl)
    setProtocol(detectProtocol(historyUrl))
    setShowHistory(false)
    onConnect(historyUrl, detectProtocol(historyUrl))
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="flex items-center gap-2">
        {/* Protocol selector */}
        <select
          value={protocol}
          onChange={e => setProtocol(e.target.value as StreamProtocol)}
          className="px-3 py-2.5 bg-gray-900/80 border border-gray-700/50 rounded-lg text-white/80 text-sm
            focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
          disabled={disabled}
        >
          <option value="whep">WHEP</option>
          <option value="rtsp">RTSP</option>
        </select>

        {/* URL input */}
        <div className="flex-1 flex items-center bg-gray-900/80 border border-gray-700/50 rounded-lg focus-within:border-blue-500/50 transition-colors">
          <IconLink className="text-white/30 ml-3 w-4 h-4 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={e => {
              setUrl(e.target.value)
              setProtocol(detectProtocol(e.target.value))
            }}
            onFocus={() => setShowHistory(true)}
            placeholder={
              protocol === 'whep'
                ? 'http://localhost:7777/whep/stream-id'
                : 'rtsp://camera-ip:554/stream'
            }
            className="flex-1 px-3 py-2.5 bg-transparent text-white/90 text-sm outline-none font-mono
              placeholder:text-white/20"
            disabled={disabled}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSubmit()
            }}
          />
          {url && (
            <button
              className="p-1 mr-1 text-white/30 hover:text-white/70"
              onClick={() => setUrl('')}
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Connect button */}
        <button
          className="btn-primary py-2.5 px-6 whitespace-nowrap"
          onClick={handleSubmit}
          disabled={disabled || !url.trim()}
        >
          Connect
        </button>
      </div>

      {/* URL hint */}
      <div className="mt-1.5 px-2 text-10px text-white/20">
        {protocol === 'rtsp'
          ? 'RTSP streams are bridged through Live777 engine (RTP→WHEP conversion)'
          : 'Enter a WHEP endpoint URL to start WebRTC playback'}
      </div>

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 panel p-2 z-50 max-h-40 overflow-y-auto">
          <div className="text-10px text-white/30 px-2 py-1 uppercase tracking-wider">Recent</div>
          {history.map((h, i) => (
            <button
              key={i}
              className="w-full text-left px-2 py-1.5 text-xs text-white/60 hover:text-white/90
                hover:bg-white/5 rounded font-mono truncate transition-colors"
              onClick={() => handleSelectHistory(h)}
            >
              {h}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
