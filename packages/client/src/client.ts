import { serialize, deserialize } from 'superjson'
import type {
  ClientOptions,
  ClientStats,
  ConnectionHandler,
  ConnectionState,
  DisconnectionHandler,
  ErrorHandler,
  EventHandler,
  MessageData,
  ReconnectHandler,
} from "./types"
import { MessageType, createPing, decodeMessage, encodeMessage, isBinaryProtocol } from "./protocol"
import { MessageQueue } from "./queue"

export class UltraClient {
  private options: Required<ClientOptions>
  private ws: WebSocket | null = null
  private eventHandlers = new Map<string, Set<EventHandler>>()
  private connectionHandlers = new Set<ConnectionHandler>()
  private disconnectionHandlers = new Set<DisconnectionHandler>()
  private errorHandlers = new Set<ErrorHandler>()
  private reconnectHandlers = new Set<ReconnectHandler>()
  private state: ConnectionState
  private stats: ClientStats
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connectionTimer: ReturnType<typeof setTimeout> | null = null
  private messageQueue: MessageQueue
  private connectStartTime = 0

  constructor(options: ClientOptions | string) {
    const opts = typeof options === "string" ? { url: options } : options

    this.options = {
      autoReconnect: true,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      reconnectBackoff: 1.5,
      maxReconnectAttempts: 0,
      connectionTimeout: 10000,
      binaryProtocol: true,
      debug: false,
      headers: {},
      query: {},
      ...opts,
    }

    this.state = {
      connected: false,
      connecting: false,
      reconnecting: false,
      reconnectAttempts: 0,
    }

    this.stats = {
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnectAttempts: 0,
    }

    this.messageQueue = new MessageQueue()
  }

  /**
   * Connect to the server
   */
  connect(): void {
    if (this.state.connected || this.state.connecting) {
      return
    }

    this.state.connecting = true
    this.connectStartTime = Date.now()

    try {
      const url = this.buildUrl()
      this.ws = new WebSocket(url)
      this.ws.binaryType = "arraybuffer"

      this.setupWebSocket()
      this.setupConnectionTimeout()
    } catch (error) {
      this.handleError(error as Error)
      this.handleReconnect()
    }
  }

  private buildUrl(): string {
    const url = new URL(this.options.url)

    // Add query parameters
    for (const [key, value] of Object.entries(this.options.query)) {
      url.searchParams.set(key, value)
    }

    return url.toString()
  }

  private setupWebSocket(): void {
    if (!this.ws) {
      return
    }

    this.ws.addEventListener("open", () => {
      this.clearConnectionTimeout()
      this.state.connected = true
      this.state.connecting = false
      this.state.reconnecting = false
      this.state.reconnectAttempts = 0
      this.state.lastConnectedAt = Date.now()
      this.stats.connectionTime = Date.now() - this.connectStartTime

      this.log("Connected to server")

      // Flush queued messages
      this.flushQueue()

      // Start ping interval
      this.startPingInterval()

      // Trigger connection handlers
      for (const handler of this.connectionHandlers) {
        Promise.resolve(handler()).catch((error: Error) => {
          this.handleError(error)
        })
      }
    })

    this.ws.addEventListener("message", (event: MessageEvent) => {
      this.handleMessage(event.data as ArrayBuffer | string)
    })

    this.ws.addEventListener("close", (event: CloseEvent) => {
      this.handleClose(event.reason || `Code ${event.code}`)
    })

    this.ws.addEventListener("error", () => {
      this.handleError(new Error("WebSocket error"))
    })
  }

  private setupConnectionTimeout(): void {
    this.connectionTimer = setTimeout(() => {
      if (!this.state.connected) {
        this.log("Connection timeout")
        this.ws?.close()
        this.handleReconnect()
      }
    }, this.options.connectionTimeout)
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer)
      this.connectionTimer = null
    }
  }

  private startPingInterval(): void {
    this.pingTimer = setInterval(() => {
      if (this.state.connected && this.ws) {
        this.ws.send(createPing())
      }
    }, 30000) // Ping every 30 seconds
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private handleMessage(data: ArrayBuffer | string): void {
    this.stats.messagesReceived += 1

    try {
      if (this.options.binaryProtocol && data instanceof ArrayBuffer) {
        this.stats.bytesReceived += data.byteLength

        if (isBinaryProtocol(data)) {
          const parsed = decodeMessage(data)

          // Ignore ping/pong
          if (parsed.type === MessageType.PING || parsed.type === MessageType.PONG) {
            return
          }

          if (parsed.event) {
            this.triggerEvent(parsed.event, parsed.data)
          }
          return
        }
      }

      const text = typeof data === "string" ? data : new TextDecoder().decode(data)
      this.stats.bytesReceived += text.length
      const serialized = JSON.parse(text)
      const parsed = deserialize(serialized) as { event: string; data: unknown }
      this.triggerEvent(parsed.event, parsed.data)
    } catch (error) {
      this.handleError(error as Error)
    }
  }

  private triggerEvent(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event)
    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      Promise.resolve(handler(data)).catch((error: Error) => {
        this.handleError(error)
      })
    }
  }

  private handleClose(reason: string): void {
    this.state.connected = false
    this.state.connecting = false
    this.state.lastDisconnectedAt = Date.now()

    this.stopPingInterval()
    this.clearConnectionTimeout()

    this.log("Disconnected:", reason)

    // Trigger disconnection handlers
    for (const handler of this.disconnectionHandlers) {
      Promise.resolve(handler(reason)).catch((error: Error) => {
        this.handleError(error)
      })
    }

    this.handleReconnect()
  }

  private handleReconnect(): void {
    if (!this.options.autoReconnect) {
      return
    }

    if (this.options.maxReconnectAttempts > 0 && this.state.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached")
      return
    }

    this.state.reconnecting = true
    this.state.reconnectAttempts += 1
    this.stats.reconnectAttempts += 1

    const delay = Math.min(
      this.options.reconnectDelay * this.options.reconnectBackoff ** (this.state.reconnectAttempts - 1),
      this.options.maxReconnectDelay,
    )

    this.log(`Reconnecting in ${delay}ms (attempt ${this.state.reconnectAttempts})`)

    // Trigger reconnect handlers
    for (const handler of this.reconnectHandlers) {
      Promise.resolve(handler(this.state.reconnectAttempts)).catch((error: Error) => {
        this.handleError(error)
      })
    }

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private handleError(error: Error): void {
    this.log("Error:", error.message)

    if (this.errorHandlers.size === 0) {
      console.error("[UltraSocket] Unhandled error:", error)
      return
    }

    for (const handler of this.errorHandlers) {
      handler(error)
    }
  }

  private flushQueue(): void {
    if (this.messageQueue.isEmpty()) {
      return
    }

    this.log(`Flushing ${this.messageQueue.size()} queued messages`)

    const messages = this.messageQueue.flush()
    for (const message of messages) {
      this.emit(message.event, message.data)
    }
  }

  private log(...args: unknown[]): void {
    if (this.options.debug) {
      console.log("[UltraSocket]", ...args)
    }
  }

  /**
   * Register an event handler
   */
  on(event: "connect", handler: ConnectionHandler): this
  on(event: "disconnect", handler: DisconnectionHandler): this
  on(event: "error", handler: ErrorHandler): this
  on(event: "reconnect", handler: ReconnectHandler): this
  on(event: string, handler: EventHandler): this
  on(event: string, handler: unknown): this {
    if (event === "connect") {
      this.connectionHandlers.add(handler as ConnectionHandler)
    } else if (event === "disconnect") {
      this.disconnectionHandlers.add(handler as DisconnectionHandler)
    } else if (event === "error") {
      this.errorHandlers.add(handler as ErrorHandler)
    } else if (event === "reconnect") {
      this.reconnectHandlers.add(handler as ReconnectHandler)
    } else {
      if (!this.eventHandlers.has(event)) {
        this.eventHandlers.set(event, new Set())
      }
      this.eventHandlers.get(event)?.add(handler as EventHandler)
    }
    return this
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: unknown): this {
    if (event === "connect") {
      this.connectionHandlers.delete(handler as ConnectionHandler)
    } else if (event === "disconnect") {
      this.disconnectionHandlers.delete(handler as DisconnectionHandler)
    } else if (event === "error") {
      this.errorHandlers.delete(handler as ErrorHandler)
    } else if (event === "reconnect") {
      this.reconnectHandlers.delete(handler as ReconnectHandler)
    } else {
      this.eventHandlers.get(event)?.delete(handler as EventHandler)
    }
    return this
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data: unknown): boolean {
    if (!this.state.connected || !this.ws) {
      // Queue message for later
      this.messageQueue.enqueue(event, data)
      return false
    }

    try {
      if (this.options.binaryProtocol) {
        const buffer = encodeMessage(event, data)
        this.ws.send(buffer)
        this.stats.bytesSent += buffer.byteLength
      } else {
        const serialized = serialize({ event, data })
        const message = JSON.stringify(serialized)
        this.ws.send(message)
        this.stats.bytesSent += message.length
      }

      this.stats.messagesSent += 1
      return true
    } catch (error) {
      this.handleError(error as Error)
      return false
    }
  }

  /**
   * Send raw message
   */
  send(data: MessageData): boolean {
    if (!this.state.connected || !this.ws) {
      return false
    }

    try {
      this.ws.send(data)
      this.stats.messagesSent += 1

      if (typeof data === "string") {
        this.stats.bytesSent += data.length
      } else if (data instanceof ArrayBuffer) {
        this.stats.bytesSent += data.byteLength
      } else {
        this.stats.bytesSent += data.byteLength
      }

      return true
    } catch (error) {
      this.handleError(error as Error)
      return false
    }
  }

  /**
   * Disconnect from the server
   */
  disconnect(): void {
    this.options.autoReconnect = false

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopPingInterval()
    this.clearConnectionTimeout()

    if (this.ws) {
      this.ws.close(1000, "Client disconnected")
      this.ws = null
    }

    this.state.connected = false
    this.state.connecting = false
    this.state.reconnecting = false
  }

  /**
   * Get connection state
   */
  getState(): ConnectionState {
    return { ...this.state }
  }

  /**
   * Get client statistics
   */
  getStats(): ClientStats {
    return { ...this.stats }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.state.connected
  }

  /**
   * Get connection time in milliseconds
   */
  get connectionTime(): number | undefined {
    return this.stats.connectionTime
  }
}