/**
 * @ultrasocket/core - High-performance WebSocket server
 *
 * @example
 * ```typescript
 * import { UltraServer } from '@ultrasocket/core';
 *
 * const server = new UltraServer({ port: 3000 });
 *
 * server.on('connection', (socket) => {
 *   console.log('Client connected:', socket.id);
 * });
 *
 * server.on('message', (socket, data) => {
 *   socket.emit('response', { received: data });
 * });
 *
 * await server.listen();
 * ```
 */

export { UltraServer } from "./server.js"
export type {
  ConnectionHandler,
  DisconnectionHandler,
  ErrorHandler,
  EventHandler,
  MessageData,
  ServerOptions,
  ServerStats,
  SocketData,
  UltraSocket,
} from "./types/index.js"
export { MessageType, createPing, createPong, decodeMessage, encodeMessage } from "./protocol.js"
