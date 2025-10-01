import type { WebSocket } from "uWebSockets.js"
import { encodeMessage } from "./protocol.js"
import type { SocketData, UltraSocket, MessageData } from "./types/index.js"

export function createUltraSocket(ws: WebSocket<SocketData>, binaryProtocol: boolean): UltraSocket {
    const socketData = ws.getUserData()

    return {
        get id() {
            return socketData.id
        },

        emit(event: string, data: unknown): boolean {
            try {
                if (binaryProtocol) {
                    const buffer = encodeMessage(event, data)
                    return ws.send(buffer, true) === 1
                }
                const message = JSON.stringify({ event, data })
                return ws.send(message, false) === 1
            } catch {
                return false
            }
        },

        send(data: MessageData): boolean {
            try {
                if (typeof data === "string") {
                    return ws.send(data, false) === 1
                }
                return ws.send(data, true) === 1
            } catch {
                return false
            }
        },

        close(): void {
            ws.end(1000, "Client closed")
        },

        get connected(): boolean {
            return !ws.close
        },

        get metadata() {
            return socketData.metadata
        },

        setMetadata(key: string, value: unknown): void {
            socketData.metadata[key] = value
        },
    }
}
