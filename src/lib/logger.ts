/**
 * Structured logger for AI Vibe Coding debugging.
 *
 * Key design decisions:
 *   1. JSON output — machine-parseable by AI tools and log aggregators
 *   2. correlationId — ties related log lines together (one per user action)
 *   3. module tag — identifies the source component instantly
 *   4. In dev mode, also prints human-readable lines to console
 *
 * Usage:
 *   const log = createLogger('WhepClient')
 *   log.info('Connecting', { url: '...' })
 *   log.error('Connection failed', err, { attempt: 3 })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  ts: string                  // ISO 8601 timestamp
  level: LogLevel
  module: string              // Component name: 'WhepClient', 'VideoGrid', etc.
  msg: string                 // Human-readable message
  ctx: Record<string, unknown> | undefined  // Structured context
  err: {                     // Present only on 'error' level
    name: string
    message: string
    stack: string | undefined
  } | undefined
  corrId: string | undefined  // Correlation ID — ties related operations together
}

export interface Logger {
  debug(msg: string, ctx?: Record<string, unknown>): void
  info(msg: string, ctx?: Record<string, unknown>): void
  warn(msg: string, ctx?: Record<string, unknown>): void
  error(msg: string, err?: Error, ctx?: Record<string, unknown>): void
  /** Create a child logger with a correlation ID */
  child(corrId: string): Logger
  /** Get the current correlation ID */
  getCorrelationId(): string | undefined
}

class ConsoleLogger implements Logger {
  private corrId: string | undefined

  constructor(
    private moduleName: string,
    corrId: string | undefined
  ) {
    this.corrId = corrId
  }

  child(corrId: string): Logger {
    return new ConsoleLogger(this.moduleName, corrId)
  }

  getCorrelationId(): string | undefined {
    return this.corrId
  }

  private emit(
    level: LogLevel,
    msg: string,
    err?: Error,
    ctx?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      ts: new Date().toISOString(),
      level,
      module: this.moduleName,
      msg,
      ctx: (ctx && Object.keys(ctx).length > 0) ? ctx : undefined,
      corrId: this.corrId,
      err: err ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
      } : undefined,
    }

    // Machine-readable JSON line
    const json = JSON.stringify(entry)
    switch (level) {
      case 'debug':
      case 'info':
        console.log(json)
        break
      case 'warn':
        console.warn(json)
        break
      case 'error':
        console.error(json)
        break
    }

    // Human-readable line (development only)
    if (import.meta.env.DEV) {
      this.prettyPrint(level, msg, err, ctx, entry.ts)
    }
  }

  private prettyPrint(
    level: LogLevel,
    msg: string,
    err?: Error,
    ctx?: Record<string, unknown>,
    _ts?: string
  ): void {
    const prefix = `[${this.moduleName}]`
    const corr = this.corrId ? ` (cid:${this.corrId.slice(0, 8)})` : ''
    const ts = new Date().toLocaleTimeString()

    const levelColors: Record<LogLevel, string> = {
      debug: '#888',
      info: '#4fc3f7',
      warn: '#ffb74d',
      error: '#ef5350',
    }
    const color = levelColors[level]
    const levelStr = level.toUpperCase().padEnd(5)

    const parts = [
      `%c${ts}%c %c${levelStr}%c ${prefix}%c${corr}`,
      'color:#666',           // timestamp
      '',                     // reset
      `color:${color};font-weight:bold`, // level
      '',                     // reset
      'color:#aaa',           // module + corrId
    ]

    if (ctx && Object.keys(ctx).length > 0) {
      console.debug(...parts, msg, ctx)
    } else if (err) {
      console.debug(...parts, msg, '\n ', err)
    } else {
      console.debug(...parts, msg)
    }
  }

  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('debug', msg, undefined, ctx)
  }

  info(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('info', msg, undefined, ctx)
  }

  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.emit('warn', msg, undefined, ctx)
  }

  error(msg: string, err?: Error, ctx?: Record<string, unknown>): void {
    this.emit('error', msg, err, ctx)
  }
}

/** Singleton logger instances by module name */
const loggers = new Map<string, Logger>()

/**
 * Get or create a logger for a module.
 *
 * Module names should be stable and descriptive:
 *   - 'WhepClient', 'WhipClient'   (client classes)
 *   - 'useWhepPlayer', 'useStreamStats'  (hooks)
 *   - 'App', 'VideoGrid'           (components)
 */
export function createLogger(module: string): Logger {
  const existing = loggers.get(module)
  if (existing) return existing
  const logger = new ConsoleLogger(module, undefined)
  loggers.set(module, logger)
  return logger
}

/** Generate a unique correlation ID for tracking a user action */
export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
