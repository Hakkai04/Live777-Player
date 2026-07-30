import { useState, useEffect, useRef } from 'react'
import { parseStats, clearStatsHistory } from '@/lib/stats-parser'
import type { StreamStats } from '@/types'

const STATS_INTERVAL = 1000 // 1 second

/**
 * Hook to periodically poll WebRTC getStats() and return parsed statistics.
 *
 * @param pc - The RTCPeerConnection to monitor (null = not connected)
 * @param enabled - Whether to actively poll (default true)
 * @returns Latest StreamStats or null if no data yet
 */
export function useStreamStats(
  pc: RTCPeerConnection | null,
  enabled = true
): StreamStats | null {
  const [stats, setStats] = useState<StreamStats | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!pc || !enabled) {
      // Clear on disconnect
      clearStatsHistory()
      setStats(null)
      return
    }

    // Do an immediate read
    void collectStats(pc, setStats)

    // Poll at regular intervals
    timerRef.current = setInterval(() => {
      void collectStats(pc, setStats)
    }, STATS_INTERVAL)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      clearStatsHistory()
    }
  }, [pc, enabled])

  return stats
}

async function collectStats(
  pc: RTCPeerConnection,
  setStats: (s: StreamStats) => void
) {
  try {
    // Only collect if connected
    if (pc.connectionState !== 'connected') return
    const result = await parseStats(pc)
    setStats(result)
  } catch {
    // getStats can throw if called during connection setup/teardown
    // Silently skip — next interval will retry
  }
}
