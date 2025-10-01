# @ultrasocket/client

High-performance WebSocket client for browser and Node.js. Reconnects in <10ms with automatic offline queueing.

## Features

- Sub-10ms reconnection time
- Automatic exponential backoff
- Offline message queueing
- Binary protocol with JSON fallback
- Works in browsers, Node.js, Bun, Deno
- Tree-shakeable (<5KB gzipped)
- TypeScript-first with full type safety

## Installation

```bash
bun add @ultrasocket/client
```

## Quick Start

```typescript
import { UltraClient } from '@ultrasocket/client';

const client = new UltraClient('ws://localhost:3000');

client.on('connect', () => {
  console.log('Connected in', client.connectionTime + 'ms');
  client.emit('hello', { message: 'Hello server!' });
});

client.on('message', (data) => {
  console.log('Received:', data);
});

client.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

client.on('reconnect', (attempt) => {
  console.log('Reconnecting... attempt', attempt);
});

client.connect();
```

## API

### `new UltraClient(options)`

Create a new UltraSocket client.

**Options:**
- `url` (string, required): WebSocket server URL
- `autoReconnect` (boolean): Enable automatic reconnection (default: true)
- `reconnectDelay` (number): Initial reconnection delay in ms (default: 1000)
- `maxReconnectDelay` (number): Maximum reconnection delay in ms (default: 30000)
- `reconnectBackoff` (number): Reconnection backoff multiplier (default: 1.5)
- `maxReconnectAttempts` (number): Maximum reconnection attempts, 0 = infinite (default: 0)
- `connectionTimeout` (number): Connection timeout in ms (default: 10000)
- `binaryProtocol` (boolean): Use binary protocol (default: true)
- `debug` (boolean): Enable debug logging (default: false)
- `headers` (object): Custom headers for connection
- `query` (object): Query parameters for connection

### Events

- `connect`: Fired when connected to server
- `disconnect`: Fired when disconnected from server
- `reconnect`: Fired when attempting to reconnect
- `error`: Fired when an error occurs
- Custom events: Register with `client.on(eventName, handler)`

### Methods

- `client.connect()`: Connect to the server
- `client.disconnect()`: Disconnect from the server
- `client.on(event, handler)`: Register event handler
- `client.off(event, handler)`: Remove event handler
- `client.emit(event, data)`: Send event to server
- `client.send(data)`: Send raw message
- `client.getState()`: Get connection state
- `client.getStats()`: Get client statistics

### Properties

- `client.connected`: Check if connected
- `client.connectionTime`: Get connection time in milliseconds

## Advanced Usage

### Custom Reconnection Strategy

```typescript
const client = new UltraClient({
  url: 'ws://localhost:3000',
  autoReconnect: true,
  reconnectDelay: 500,
  maxReconnectDelay: 10000,
  reconnectBackoff: 2,
  maxReconnectAttempts: 10,
});
```

### Offline Queueing

Messages sent while disconnected are automatically queued and sent when reconnected:

```typescript
client.emit('message', { text: 'This will be queued if offline' });
```

### Debug Mode

```typescript
const client = new UltraClient({
  url: 'ws://localhost:3000',
  debug: true, // Logs all connection events
});
```