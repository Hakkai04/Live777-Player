import type { StreamStats, Resolution, LatencyInfo } from '@/types'

/**
 * Parse a WebRTC stats report into StreamStats.
 *
 * Key stats extracted:
 *   - inbound-rtp: resolution, bitrate, frameRate, jitter, packetsLost
 *   - remote-inbound-rtp: round-trip time
 *   - codec: MIME type
 *   - peer-connection: connectionState (actual state from the RTCPeerConnection object)
 */

interface BytesDelta {
  timestamp: number
  bytes: number
}

interface PacketDelta {
  timestamp: number
  packets: number
  packetsLost: number
}

// Keep history for rate calculations across calls
const bytesHistory = new Map<string, BytesDelta>()
const packetHistory = new Map<string, PacketDelta>()

export async function parseStats(pc: RTCPeerConnection): Promise<StreamStats> {
  const report = await pc.getStats()
  const now = Date.now()

  let resolution: Resolution = { width: 0, height: 0 }
  let codec = 'unknown'
  let bitrate = 0
  let frameRate = 0
  let jitter = 0
  let packetLoss = 0
  let rtt = 0

  // Build codec map: codecId -> mimeType
  const codecMap = new Map<string, string>()
  for (const [_key, stat] of report) {
    if (stat.type === 'codec' && stat.mimeType) {
      codecMap.set(stat.id, stat.mimeType)
    }
  }

  for (const [_key, stat] of report) {
    switch (stat.type) {
      case 'inbound-rtp': {
        // Resolution
        if (stat.frameWidth && stat.frameHeight) {
          resolution = {
            width: stat.frameWidth,
            height: stat.frameHeight
          }
        }

        // Frame rate
        if (stat.framesPerSecond !== undefined) {
          frameRate = Math.round(stat.framesPerSecond)
        }

        // Jitter (in seconds, convert to ms)
        if (stat.jitter !== undefined) {
          jitter = Math.round(stat.jitter * 1000)
        }

        // Bitrate calculation (bytesReceived delta)
        if (stat.bytesReceived !== undefined) {
          const prev = bytesHistory.get(stat.id)
          if (prev && prev.timestamp > 0) {
            const timeDelta = (now - prev.timestamp) / 1000 // seconds
            const bytesDelta = stat.bytesReceived - prev.bytes
            if (timeDelta > 0) {
              bitrate = Math.round((bytesDelta * 8) / (timeDelta * 1000)) // kbps
            }
          }
          bytesHistory.set(stat.id, { timestamp: now, bytes: stat.bytesReceived })
        }

        // Packet loss
        if (stat.packetsReceived !== undefined) {
          const prev = packetHistory.get(stat.id)
          if (prev && prev.timestamp > 0) {
            const packetsDelta = stat.packetsReceived - prev.packets
            const packetsLostDelta = (stat.packetsLost || 0) - prev.packetsLost
            const totalPackets = packetsDelta + packetsLostDelta
            if (totalPackets > 0) {
              packetLoss = Math.round((packetsLostDelta / totalPackets) * 1000) / 10
            }
          }
          packetHistory.set(stat.id, {
            timestamp: now,
            packets: stat.packetsReceived,
            packetsLost: stat.packetsLost || 0
          })
        }

        // Codec
        if (stat.codecId && codecMap.has(stat.codecId)) {
          codec = codecMap.get(stat.codecId)!
        }
        break
      }

      case 'remote-inbound-rtp': {
        // RTT
        if (stat.roundTripTime !== undefined) {
          rtt = Math.round(stat.roundTripTime * 1000) // seconds -> ms
        }
        break
      }

      case 'candidate-pair': {
        // Fallback RTT from the active candidate pair
        if (stat.state === 'succeeded' && stat.currentRoundTripTime !== undefined) {
          const candidateRtt = Math.round(stat.currentRoundTripTime * 1000)
          if (rtt === 0) {
            rtt = candidateRtt
          }
        }
        break
      }
    }
  }

  const latency: LatencyInfo = { rtt, jitter }

  return {
    resolution,
    bitrate,
    frameRate,
    latency,
    packetLoss,
    codec,
    connectionState: pc.connectionState || 'new',
    timestamp: now
  }
}

/** Clear history — call on disconnect to avoid stale deltas */
export function clearStatsHistory() {
  bytesHistory.clear()
  packetHistory.clear()
}
