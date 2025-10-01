import { App, type TemplatedApp, type WebSocket } from "uWebSockets.js"
import { deserialize } from "superjson"
import { createUltraSocket } from "./socket"
import { createPong, decodeMessage, isBinaryProtocol } from "./protocol"
import type {
    ConnectionHandler, DisconnectionHandler, ErrorHandler,
    EventHandler, ServerOptions, ServerStats, SocketData
} from "./types"

export class UltraServer {
    private app: TemplatedApp
    private options: Required<ServerOptions>
    private eventHandlers = new Map<string, Set<EventHandler>>()
    private connectionHandlers = new Set<ConnectionHandler>()
    private disconnectionHandlers = new Set<DisconnectionHandler>()
    private errorHandlers = new Set<ErrorHandler>()
    private sockets = new Map<string, WebSocket<SocketData>>()
    private stats: ServerStats
    private startTime: number

    constructor(options: ServerOptions) {
        this.options = {
            host: "0.0.0.0",
            ssl: false,
            certPath: "",
            keyPath: "",
            compression: true,
            binaryProtocol: true,
            maxPayloadLength: 16 * 1024 * 1024, // 16MB
            idleTimeout: 120,
            maxBackpressure: 1024 * 1024, // 1MB
            ...options,
        }

        this.app = App()
        this.startTime = Date.now()
        this.stats = {
            connections: 0,
            messagesReceived: 0,
            messagesSent: 0,
            bytesReceived: 0,
            bytesSent: 0,
            uptime: 0,
        }

        this.setupWebSocket()
    }

    private setupWebSocket(): void {
        this.app.ws<SocketData>("/*", {
            compression: this.options.compression ? 1 : 0,
            maxPayloadLength: this.options.maxPayloadLength,
            idleTimeout: this.options.idleTimeout,
            maxBackpressure: this.options.maxBackpressure,

            upgrade: (res, req, context) => {
                const socketData: SocketData = {
                    id: this.generateSocketId(),
                    connectedAt: Date.now(),
                    metadata: {},
                }

                res.upgrade(
                    socketData,
                    req.getHeader('sec-websocket-key'),
                    req.getHeader('sec-websocket-protocol'),
                    req.getHeader('sec-websocket-extensions'),
                    context
                )
            },

            open: (ws: WebSocket<SocketData>) => {
                const socketData = ws.getUserData()
                this.sockets.set(socketData.id, ws)
                this.stats.connections = this.sockets.size

                const ultraSocket = createUltraSocket(ws, this.options.binaryProtocol)

                for (const handler of this.connectionHandlers) {
                    Promise.resolve(handler(ultraSocket)).catch((error: Error) => {
                        this.handleError(error)
                    })
                }
            },

            message: (ws: WebSocket<SocketData>, message: ArrayBuffer) => {
                this.stats.messagesReceived += 1
                this.stats.bytesReceived += message.byteLength

                const ultraSocket = createUltraSocket(ws, this.options.binaryProtocol)

                try {
                    if (this.options.binaryProtocol && isBinaryProtocol(message)) {
                        const parsed = decodeMessage(message)

                        if (parsed.type === 0x02) {
                            const sent = ws.send(createPong(), true)
                            if (sent === 1) {
                                this.stats.messagesSent += 1
                            }
                            return
                        }

                        if (parsed.event) {
                            this.handleEvent(parsed.event, ultraSocket, parsed.data)
                        }
                    } else {
                        const text = new TextDecoder().decode(message)
                        const serialized = JSON.parse(text)
                        const parsed = deserialize(serialized) as { event: string; data: unknown }
                        this.handleEvent(parsed.event, ultraSocket, parsed.data)
                    }
                } catch (error) {
                    this.handleError(error as Error)
                }
            },

            close: (ws: WebSocket<SocketData>, code: number, message: ArrayBuffer) => {
                const socketData = ws.getUserData()
                this.sockets.delete(socketData.id)
                this.stats.connections = this.sockets.size

                const ultraSocket = createUltraSocket(ws, this.options.binaryProtocol)
                const reason = new TextDecoder().decode(message) || `Code ${code}`

                for (const handler of this.disconnectionHandlers) {
                    Promise.resolve(handler(ultraSocket, reason)).catch((error: Error) => {
                        this.handleError(error)
                    })
                }
            },
        })
    }

    private handleEvent(event: string, socket: unknown, data: unknown): void {
        const handlers = this.eventHandlers.get(event)
        if (!handlers) {
            return
        }

        for (const handler of handlers) {
            Promise.resolve(handler(socket as never, data)).catch((error: Error) => {
                this.handleError(error)
            })
        }
    }

    private handleError(error: Error): void {
        if (this.errorHandlers.size === 0) {
            console.error("[UltraSocket] Unhandled error:", error)
            return
        }

        for (const handler of this.errorHandlers) {
            handler(error)
        }
    }

    private generateSocketId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    }

    /**
     * Register an event handler
     */
    on(event: "connection", handler: ConnectionHandler): this
    on(event: "disconnection", handler: DisconnectionHandler): this
    on(event: "error", handler: ErrorHandler): this
    on(event: string, handler: EventHandler): this
    on(event: string, handler: unknown): this {
        if (event === "connection") {
            this.connectionHandlers.add(handler as ConnectionHandler)
        } else if (event === "disconnection") {
            this.disconnectionHandlers.add(handler as DisconnectionHandler)
        } else if (event === "error") {
            this.errorHandlers.add(handler as ErrorHandler)
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
        if (event === "connection") {
            this.connectionHandlers.delete(handler as ConnectionHandler)
        } else if (event === "disconnection") {
            this.disconnectionHandlers.delete(handler as DisconnectionHandler)
        } else if (event === "error") {
            this.errorHandlers.delete(handler as ErrorHandler)
        } else {
            this.eventHandlers.get(event)?.delete(handler as EventHandler)
        }
        return this
    }

    /**
     * Broadcast message to all connected sockets
     */
    broadcast(event: string, data: unknown): void {
        for (const ws of this.sockets.values()) {
            const ultraSocket = createUltraSocket(ws, this.options.binaryProtocol)
            const sent = ultraSocket.emit(event, data)
            if (sent) {
                this.stats.messagesSent += 1
            }
        }
    }

    /**
     * Get server statistics
     */
    getStats(): ServerStats {
        return {
            ...this.stats,
            uptime: Date.now() - this.startTime,
        }
    }

    /**
     * Start the server
     */
    listen(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.app.listen(this.options.port, (token) => {
                if (token) {
                    resolve()
                } else {
                    reject(new Error(`Failed to listen on port ${this.options.port}`))
                }
            })
        })
    }

    /**
     * Close the server
     */
    close(): void {
        for (const ws of this.sockets.values()) {
            ws.end(1001, "Server shutting down")
        }
        this.sockets.clear()
    }
}