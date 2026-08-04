/**
 * RTSP-to-WHEP bridge client.
 *
 * When a user enters an rtsp:// URL, the frontend calls
 * POST /bridge/rtsp to register the RTSP source with Live777.
 * The bridge returns a WHEP URL that the player can use directly.
 */

interface RtspBridgeResponse {
  whepUrl: string
  streamId: string
}

interface RtspBridgeErrorBody {
  error?: string
}

/**
 * Resolve an RTSP URL to a WHEP playback URL via the bridge.
 *
 * @throws If the bridge is unreachable or returns an error
 */
export async function resolveRtspUrl(rtspUrl: string): Promise<RtspBridgeResponse> {
  const resp = await fetch('/bridge/rtsp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: rtspUrl }),
  })

  if (!resp.ok) {
    const body = await resp.text().catch(() => '')
    let message = `Bridge returned ${String(resp.status)}`
    try {
      const err: RtspBridgeErrorBody = JSON.parse(body) as RtspBridgeErrorBody
      if (err.error) message = err.error
    } catch { /* use default */ }
    throw new Error(message)
  }

  const data = await resp.json() as RtspBridgeResponse
  return data
}
