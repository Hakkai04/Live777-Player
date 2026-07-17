import { useRef, useState, useEffect, useCallback } from 'react'
import { WhepClient } from '@/lib/whep-client'
import type { PlayerState } from '@/types'

interface UseWhepPlayerReturn {
  stream: MediaStream | null
  state: PlayerState
  error: Error | null
  pc: RTCPeerConnection | null
  connect: () => Promise<void>
  disconnect: () => void
  restart: () => Promise<void>
}

/**
 * React hook for WHEP-based WebRTC playback.
 *
 * Usage:
 *   const { stream, state, connect, disconnect } = useWhepPlayer({
 *     url: 'http://localhost:7777/whep/my-stream-id'
 *   })
 *
 * The hook manages the full WHEP client lifecycle:
 *   - Creates WHEP connection on mount (if autoConnect)
 *   - Returns MediaStream for <video> rendering
 *   - Watchdog auto-restarts on connection loss
 *   - Cleanup on unmount
 */
export function useWhepPlayer(url: string | null, autoConnect = true): UseWhepPlayerReturn {
  const clientRef = useRef<WhepClient | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<PlayerState>('idle')
  const [error, setError] = useState<Error | null>(null)
  const [pc, setPc] = useState<RTCPeerConnection | null>(null)

  // Initialize client when URL changes
  useEffect(() => {
    // Cleanup previous client
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }

    if (!url) {
      setStream(null)
      setState('idle')
      setError(null)
      setPc(null)
      return
    }

    const client = new WhepClient(url)
    clientRef.current = client

    client.setCallbacks({
      onStateChange: (newState) => {
        setState(newState)
        setError(client.error)
        setPc(client.getPeerConnection())
      },
      onStreamReady: (newStream) => {
        setStream(newStream)
      },
      onError: (err) => {
        setError(err)
      }
    })

    if (autoConnect) {
      client.connect()
    }

    return () => {
      client.disconnect()
      clientRef.current = null
    }
  }, [url])

  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect()
    }
  }, [])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
    setStream(null)
    setState('idle')
  }, [])

  const restart = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.restart()
    }
  }, [])

  return {
    stream,
    state,
    error,
    pc,
    connect,
    disconnect,
    restart
  }
}
