import { useEffect, useRef, useState, useCallback } from 'react'
import { getToken } from '@/lib/api'
import type { WSInbound, WSOutbound } from '@/lib/types'

/**
 * Low-level WebSocket client: connects to /ws with the JWT, auto-reconnects,
 * forwards parsed events to `onEvent`, and exposes a typed `send`.
 */
export function useChatSocket(onEvent: (e: WSInbound) => void) {
  const wsRef = useRef<WebSocket | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent
  const reconnectTimer = useRef<number | null>(null)
  const closedRef = useRef(false)
  const [connected, setConnected] = useState(false)

  const connect = useCallback(() => {
    const token = getToken()
    if (!token) return
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => {
      setConnected(false)
      if (!closedRef.current) {
        reconnectTimer.current = window.setTimeout(connect, 2000)
      }
    }
    ws.onerror = () => ws.close()
    ws.onmessage = (ev) => {
      try {
        onEventRef.current(JSON.parse(ev.data) as WSInbound)
      } catch {
        // ignore malformed frames
      }
    }
  }, [])

  useEffect(() => {
    closedRef.current = false
    connect()
    return () => {
      closedRef.current = true
      if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
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
