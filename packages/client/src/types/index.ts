export type MessageData = string | ArrayBuffer | Uint8Array

export interface ClientOptions {
  /** WebSocket URL */
  url: string
  /** Enable automatic reconnection */
  autoReconnect?: boolean
  /** Initial reconnection delay in ms */
  reconnectDelay?: number
  /** Maximum reconnection delay in ms */
  maxReconnectDelay?: number
  /** Reconnection backoff multiplier */
  reconnectBackoff?: number
  /** Maximum reconnection attempts (0 = infinite) */
  maxReconnectAttempts?: number
  /** Connection timeout in ms */
  connectionTimeout?: number
  /** Use binary protocol */
  binaryProtocol?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Custom headers for connection */
  headers?: Record<string, string>
  /** Query parameters for connection */
  query?: Record<string, string>
}

export interface ConnectionState {
  connected: boolean
  connecting: boolean
  reconnecting: boolean
  reconnectAttempts: number
  lastConnectedAt?: number
  lastDisconnectedAt?: number
}

export type EventHandler = (data: unknown) => void | Promise<void>
export type ConnectionHandler = () => void | Promise<void>
export type DisconnectionHandler = (reason: string) => void | Promise<void>
export type ErrorHandler = (error: Error) => void | Promise<void>
export type ReconnectHandler = (attempt: number) => void | Promise<void>

export interface ClientStats {
  messagesSent: number
  messagesReceived: number
  bytesSent: number
  bytesReceived: number
  reconnectAttempts: number
  connectionTime?: number
}
