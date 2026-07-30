import { useRef, useState, useEffect, useCallback } from 'react'
import { WhipClient } from '@/lib/whip-client'
import type { PlayerState } from '@/types'

interface UseWhipPublisherOptions {
  streamId: string | null
  cameraId?: string
  micId?: string
  autoConnect?: boolean
}

interface UseWhipPublisherReturn {
  stream: MediaStream | null
  state: PlayerState
  error: Error | null
  whepUrl: string | null
  connect: () => Promise<void>
  disconnect: () => void
}

/**
 * React hook for WHIP-based camera publishing to Live777.
 *
 * Usage:
 *   const { stream, state, whepUrl, connect, disconnect } = useWhipPublisher({
 *     streamId: 'my-camera'
 *   })
 *
 * Manages the full WhipClient lifecycle:
 *   - Creates WhipClient on streamId change
 *   - Returns local MediaStream for <video> preview
 *   - Returns the WHEP URL for playback sharing
 *   - Cleanup on unmount
 */
export function useWhipPublisher({
  streamId,
  cameraId,
  micId,
  autoConnect = false
}: UseWhipPublisherOptions): UseWhipPublisherReturn {
  const clientRef = useRef<WhipClient | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<PlayerState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [whepUrl, setWhepUrl] = useState<string | null>(null)

  // Initialize client when streamId changes
  useEffect(() => {
    // Cleanup previous client
    if (clientRef.current) {
      void clientRef.current.disconnect()
      clientRef.current = null
    }

    if (!streamId) {
      setStream(null)
      setState('idle')
      setError(null)
      setWhepUrl(null)
      return
    }

    const client = new WhipClient(streamId, cameraId, micId)
    clientRef.current = client

    client.setCallbacks({
      onStateChange: (newState) => {
        setState(newState)
        setStream(client.getStream())
        setWhepUrl(client.getWhepUrl())
      },
      onError: (err) => {
        setError(err)
      }
    })

    if (autoConnect) {
      void client.connect().then(() => {
        setStream(client.getStream())
        setWhepUrl(client.getWhepUrl())
      })
    }

    return () => {
      void client.disconnect()
      clientRef.current = null
    }
  }, [streamId])

  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect()
      setStream(clientRef.current.getStream())
      setWhepUrl(clientRef.current.getWhepUrl())
    }
  }, [])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      void clientRef.current.disconnect()
    }
    setStream(null)
    setState('idle')
    setWhepUrl(null)
  }, [])

  return {
    stream,
    state,
    error,
    whepUrl,
    connect,
    disconnect
  }
}
