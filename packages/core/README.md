# @ultrasocket/core

High-performance WebSocket server built on uWebSockets.js. Handles 1M+ concurrent connections with sub-millisecond latency.

## Features

- Binary-first protocol with JSON fallback
- Zero-copy message passing
- Built-in compression
- SSL/TLS support
- Connection pooling
- Memory efficient (<200MB for 100k connections)
- TypeScript-first with full type safety

## Installation

```bash
bun add @ultrasocket/core
```

## Quick Start

```typescript
import { UltraServer } from '@ultrasocket/core';

const server = new UltraServer({
  port: 3000,
  compression: true,
  binaryProtocol: true,
});

server.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('welcome', { message: 'Hello from UltraSocket!' });
});

server.on('message', (socket, data) => {
  console.log('Received:', data);
  socket.emit('response', { received: true });
});

server.on('disconnection', (socket, reason) => {
  console.log('Client disconnected:', socket.id, reason);
});

await server.listen();
console.log('Server listening on port 3000');
```

## API

### `new UltraServer(options)`

Create a new UltraSocket server.

**Options:**
- `port` (number, required): Port to listen on
- `host` (string): Host to bind to (default: '0.0.0.0')
- `compression` (boolean): Enable compression (default: true)
- `binaryProtocol` (boolean): Use binary protocol (default: true)
- `maxPayloadLength` (number): Maximum payload size in bytes (default: 16MB)
- `idleTimeout` (number): Idle timeout in seconds (default: 120)
- `ssl` (boolean): Enable SSL/TLS (default: false)
- `certPath` (string): SSL certificate path
- `keyPath` (string): SSL key path

### Events

- `connection`: Fired when a client connects
- `disconnection`: Fired when a client disconnects
- `error`: Fired when an error occurs
- Custom events: Register with `server.on(eventName, handler)`

### Methods

- `server.on(event, handler)`: Register event handler
- `server.off(event, handler)`: Remove event handler
- `server.broadcast(event, data)`: Broadcast to all clients
- `server.getStats()`: Get server statistics
- `server.listen()`: Start the server
- `server.close()`: Close the server
