export type MessageData = string | ArrayBuffer | Uint8Array

export interface ServerOptions {
  /** Port to listen on */
  port: number
  /** Host to bind to */
  host?: string
  /** Enable SSL/TLS */
  ssl?: boolean
  /** SSL certificate path */
  certPath?: string
  /** SSL key path */
  keyPath?: string
  /** Enable compression */
  compression?: boolean
  /** Use binary protocol (default: true) */
  binaryProtocol?: boolean
  /** Maximum payload size in bytes */
  maxPayloadLength?: number
  /** Idle timeout in seconds */
  idleTimeout?: number
  /** Maximum backpressure before closing connection */
  maxBackpressure?: number
}

export interface SocketData {
  id: string
  connectedAt: number
  metadata: Record<string, unknown>
}

export interface UltraSocket {
  /** Unique socket ID */
  readonly id: string
  /** Send message to this socket */
  emit: (event: string, data: unknown) => boolean
  /** Send binary message to this socket */
  send: (data: MessageData) => boolean
  /** Close this socket */
  close: () => void
  /** Check if socket is connected */
  readonly connected: boolean
  /** Get socket metadata */
  readonly metadata: Record<string, unknown>
  /** Set socket metadata */
  setMetadata: (key: string, value: unknown) => void
}

export type EventHandler = (socket: UltraSocket, data: unknown) => void | Promise<void>
export type ConnectionHandler = (socket: UltraSocket) => void | Promise<void>
export type DisconnectionHandler = (socket: UltraSocket, reason: string) => void | Promise<void>
export type ErrorHandler = (error: Error) => void

export interface ServerStats {
  connections: number
  messagesReceived: number
  messagesSent: number
  bytesReceived: number
  bytesSent: number
  uptime: number
}
