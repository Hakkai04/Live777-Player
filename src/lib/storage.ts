/**
 * Minimal localStorage wrappers for the player.
 */

const PREFIX = 'player_'

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // ignore
  }
}

/** History of entered stream URLs */
export function getUrlHistory(): string[] {
  return getItem<string[]>('url_history', [])
}

export function addUrlToHistory(url: string): void {
  const history = getUrlHistory().filter(u => u !== url)
  history.unshift(url)
  // Keep last 20
  setItem('url_history', history.slice(0, 20))
}
