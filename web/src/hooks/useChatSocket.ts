import { useEffect, useRef, useState, useCallback } from 'react'
import { getToken } from '@/lib/api'
import type { WSInbound, WSOutbound } from '@/lib/types'

const HEARTBEAT_INTERVAL = 25_000 // send a ping this often
const PONG_TIMEOUT = 10_000 // consider the link dead if no pong within this
const MAX_BACKOFF = 30_000

interface Options {
  onEvent: (e: WSInbound) => void
  /** Called after a *re*connection (not the first connect) so callers can re-sync. */
  onReconnect?: () => void
}

/**
 * Resilient WebSocket client:
 * - auto-reconnect with exponential backoff + jitter
 * - app-level heartbeat (ping/pong) to detect half-open connections on flaky networks
 * - immediate reconnect when the browser regains network or the tab becomes visible
 * - notifies `onReconnect` so state can be re-synced after downtime
 */
export function useChatSocket({ onEvent, onReconnect }: Options) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const onReconnectRef = useRef(onReconnect)
  onReconnectRef.current = onReconnect

  const reconnectTimer = useRef<number | null>(null)
  const heartbeatTimer = useRef<number | null>(null)
  const pongTimer = useRef<number | null>(null)
  const attempts = useRef(0)
  const closedRef = useRef(false)
  const everConnected = useRef(false)
  const connectRef = useRef<() => void>(() => {})

  const [connected, setConnected] = useState(false)

  const clearHeartbeat = () => {
    if (heartbeatTimer.current) {
      window.clearInterval(heartbeatTimer.current)
      heartbeatTimer.current = null
    }
    if (pongTimer.current) {
      window.clearTimeout(pongTimer.current)
      pongTimer.current = null
    }
  }

  const scheduleReconnect = useCallback(() => {
    if (closedRef.current || reconnectTimer.current) return
    const delay = Math.min(MAX_BACKOFF, 1000 * 2 ** attempts.current) + Math.random() * 1000
    attempts.current += 1
    reconnectTimer.current = window.setTimeout(() => {
      reconnectTimer.current = null
      connectRef.current()
    }, delay)
  }, [])

  const connect = useCallback(() => {
    const token = getToken()
    if (!token || closedRef.current) return
    // Avoid stacking sockets.
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return

    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      attempts.current = 0
      setConnected(true)
      clearHeartbeat()
      heartbeatTimer.current = window.setInterval(() => {
        if (ws.readyState !== WebSocket.OPEN) return
        ws.send(JSON.stringify({ type: 'ping' } satisfies WSOutbound))
        if (pongTimer.current) window.clearTimeout(pongTimer.current)
        pongTimer.current = window.setTimeout(() => ws.close(), PONG_TIMEOUT)
      }, HEARTBEAT_INTERVAL)

      if (everConnected.current) onReconnectRef.current?.()
      everConnected.current = true
    }

    ws.onmessage = (ev) => {
      let data: WSInbound
      try {
        data = JSON.parse(ev.data) as WSInbound
      } catch {
        return
      }
      if (data.type === 'pong') {
        if (pongTimer.current) {
          window.clearTimeout(pongTimer.current)
          pongTimer.current = null
        }
        return
      }
      onEventRef.current(data)
    }

    ws.onerror = () => ws.close()

    ws.onclose = () => {
      setConnected(false)
      clearHeartbeat()
      if (wsRef.current === ws) wsRef.current = null
      scheduleReconnect()
    }
  }, [scheduleReconnect])

  connectRef.current = connect

  useEffect(() => {
    closedRef.current = false
    attempts.current = 0
    everConnected.current = false
    connect()

    // Reconnect promptly when the environment recovers.
    const kick = () => {
      const ws = wsRef.current
      if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
        attempts.current = 0
        if (reconnectTimer.current) {
          window.clearTimeout(reconnectTimer.current)
          reconnectTimer.current = null
        }
        connect()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') kick()
    }
    window.addEventListener('online', kick)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      closedRef.current = true
      window.removeEventListener('online', kick)
      document.removeEventListener('visibilitychange', onVisible)
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
      clearHeartbeat()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])

  const send = useCallback((msg: WSOutbound): boolean => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }, [])

  return { connected, send }
}
