/**
 * WebSocket client for real-time BBDSL YAML validation.
 */

export interface ValidationResultItem {
  rule_id: string
  severity: 'error' | 'warning'
  message: string
  scope?: string
}

export interface ValidationReport {
  error_count: number
  warning_count: number
  results: ValidationResultItem[]
}

export interface WsValidationMessage {
  status: 'ok' | 'error'
  report: ValidationReport
  message?: string
}

/**
 * Create a debounced WebSocket connection for real-time validation.
 *
 * @param onMessage Callback invoked when a validation report is received.
 * @param debounceMs Debounce delay in milliseconds (default 500).
 */
export function createValidationWs(
  onMessage: (msg: WsValidationMessage) => void,
  debounceMs = 500,
) {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const url = `${protocol}://${window.location.host}/api/v1/validate`
  let ws: WebSocket | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    ws = new WebSocket(url)
    ws.onmessage = (event) => {
      try {
        const data: WsValidationMessage = JSON.parse(event.data)
        onMessage(data)
      } catch {
        console.error('Failed to parse WS message')
      }
    }
    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(connect, 3000)
    }
  }

  connect()

  return {
    send(yamlText: string) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(yamlText)
        }
      }, debounceMs)
    },
    close() {
      if (timer) clearTimeout(timer)
      ws?.close()
    },
  }
}
