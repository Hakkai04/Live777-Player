import { useState } from 'react'
import type { StreamStats as StreamStatsType } from '@/types'

interface StreamStatsProps {
  stats: StreamStatsType | null
  connectionState: string | undefined
}

export function StreamStats({ stats, connectionState }: StreamStatsProps) {
  const [collapsed, setCollapsed] = useState(false)

  const hasData = stats && stats.resolution.width > 0

  // Connection state badge color
  const stateColor: Record<string, string> = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    new: 'bg-blue-500',
    disconnected: 'bg-red-500',
    failed: 'bg-red-500',
    closed: 'bg-gray-500'
  }

  const badgeColor = stateColor[connectionState || ''] || 'bg-gray-500'

  return (
    <div className="card bg-base-200/90 backdrop-blur-sm border border-base-content/10 rounded-xl p-3 text-xs font-mono text-white/80 min-w-48 backdrop-blur-md">
      {/* Header — click to collapse */}
      <div
        className="flex items-center justify-between cursor-pointer mb-2"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
          <span className="text-white/70 uppercase tracking-wider text-10px">Stream Info</span>
        </div>
        <span className="text-white/55 text-10px">{collapsed ? '+' : '−'}</span>
      </div>

      {!collapsed && (
        <div className="space-y-1.5">
          {/* Connection State */}
          <StatRow label="State" value={connectionState || 'unknown'} />

          {hasData && stats ? (
            <>
              {/* Resolution */}
              <StatRow
                label="Resolution"
                value={`${String(stats.resolution.width)}×${String(stats.resolution.height)}`}
              />

              {/* Bitrate */}
              <StatRow
                label="Bitrate"
                value={stats.bitrate > 0 ? `${String(stats.bitrate)} kbps` : '--'}
              />

              {/* Frame Rate */}
              <StatRow
                label="FPS"
                value={stats.frameRate > 0 ? String(stats.frameRate) : '--'}
              />

              {/* Codec */}
              <StatRow label="Codec" value={stats.codec || '--'} />

              {/* Latency */}
              <StatRow
                label="RTT"
                value={stats.latency.rtt > 0 ? `${String(stats.latency.rtt)}ms` : '--'}
              />
              <StatRow
                label="Jitter"
                value={stats.latency.jitter > 0 ? `${String(stats.latency.jitter)}ms` : '--'}
              />

              {/* Packet Loss */}
              <StatRow
                label="Loss"
                value={`${stats.packetLoss.toFixed(1)}%`}
                danger={stats.packetLoss > 2}
              />
            </>
          ) : (
            <div className="text-white/55 italic">Waiting for data...</div>
          )}
        </div>
      )}
    </div>
  )
}

function StatRow({
  label,
  value,
  danger = false
}: {
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-white/55">{label}</span>
      <span className={danger ? 'text-red-400' : 'text-white/80'}>{value}</span>
    </div>
  )
}
