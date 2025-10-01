/**
 * @ultrasocket/client - High-performance WebSocket client
 *
 * @example
 * ```typescript
 * import { UltraClient } from '@ultrasocket/client';
 *
 * const client = new UltraClient('ws://localhost:3000');
 *
 * client.on('connect', () => {
 *   console.log('Connected!');
 *   client.emit('hello', { message: 'Hello server!' });
 * });
 *
 * client.on('message', (data) => {
 *   console.log('Received:', data);
 * });
 *
 * client.connect();
 * ```
 */

export { UltraClient } from "./client"
export type {
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
export { MessageType, createPing, decodeMessage, encodeMessage } from "./protocol"
