import { useState, useEffect, useCallback, type RefObject } from 'react'

interface UseFullscreenReturn {
  isFullscreen: boolean
  isSupported: boolean
  enter: () => Promise<void>
  exit: () => Promise<void>
  toggle: () => Promise<void>
}

/** Extended document type for webkit-prefixed fullscreen API */
type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void>
}

/** Extended element type for webkit-prefixed fullscreen API */
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>
}

/**
 * Hook for managing fullscreen state on a container element.
 *
 * @param ref - RefObject pointing to the element to make fullscreen
 * @returns Fullscreen controls and state
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isSupported =
    typeof document !== 'undefined' &&
    (document.fullscreenEnabled || (document as WebkitDocument).webkitFullscreenEnabled === true)

  // Listen for fullscreen change events
  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const enter = useCallback(async () => {
    const el = ref.current
    if (!el) return
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else {
        const webkitEl = el as WebkitElement
        await webkitEl.webkitRequestFullscreen?.()
      }
    } catch (e) {
      // Fullscreen request was denied (e.g., user didn't interact first)
      console.warn('Fullscreen request denied:', e)
    }
  }, [ref])

  const exit = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else {
        const webkitDoc = document as WebkitDocument
        await webkitDoc.webkitExitFullscreen?.()
      }
    } catch {
      // ignore
    }
  }, [])

  const toggle = useCallback(async () => {
    if (isFullscreen) {
      await exit()
    } else {
      await enter()
    }
  }, [isFullscreen, enter, exit])

  return {
    isFullscreen,
    isSupported,
    enter,
    exit,
    toggle
  }
}
