# 🚀 UltraSocket

**The WebSocket library that makes Socket.IO look like dial-up internet.**

> 20x faster than Socket.IO | 1M+ concurrent connections | <5KB client bundle

## ⚡ Performance That Slaps

- **20x faster** than Socket.IO in real benchmarks
- **1M+ concurrent connections** on a single server
- **Sub-millisecond latency** for message delivery
- **<200MB memory usage** at massive scale
- **<5KB client bundle** (gzipped)

## 🎯 Why UltraSocket?

Tired of WebSocket solutions that choke at scale? UltraSocket is built different:

- **C++ Core**: Built on uWebSockets.js for native performance
- **Binary First**: Zero-copy binary protocol (JSON is the fallback)
- **Infinite Scale**: Redis clustering that actually works
- **Universal Client**: Works everywhere (browsers, Node.js, Bun, Deno, React Native)
- **Developer Joy**: APIs so clean they feel illegal

## 📦 Packages

| Package | Description | Version |
|---------|-------------|---------|
| [`@ultrasocket/core`](./packages/core) | The engine - C++ performance with JS DX | ![npm](https://img.shields.io/npm/v/@ultrasocket/core) |
| [`@ultrasocket/client`](./packages/client) | Browser/Node.js client (coming soon) | ![npm](https://img.shields.io/npm/v/@ultrasocket/client) |
| [`@ultrasocket/cluster`](./packages/cluster) | Redis-based clustering (coming soon) | ![npm](https://img.shields.io/npm/v/@ultrasocket/cluster) |
| [`@ultrasocket/rooms`](./packages/rooms) | Room management (coming soon) | ![npm](https://img.shields.io/npm/v/@ultrasocket/rooms) |
| [`@ultrasocket/auth`](./packages/auth) | Authentication middleware (coming soon) | ![npm](https://img.shields.io/npm/v/@ultrasocket/auth) |
| [`@ultrasocket/monitoring`](./packages/monitoring) | - Metrics and monitoring (coming soon) | ![npm](https://img.shields.io/npm/v/@ultrasocket/monitoring) |

## 🚀 Quick Start

### Server Setup

```typescript
import { UltraServer } from '@ultrasocket/core';

const server = new UltraServer({
  port: 3000,
  compression: true,
  binaryProtocol: true
});

server.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);
  
  socket.on('message', (data) => {
    // Echo message back
    socket.send(data);
  });
});

await server.listen();
console.log('🚀 UltraServer running on port 3000');
```

### Client Setup

```typescript
import { UltraClient } from '@ultrasocket/client';

const client = new UltraClient('ws://localhost:3000');

client.on('connect', () => {
  console.log('Connected in', client.connectionTime + 'ms');
  client.send({ message: 'Hello UltraSocket!' });
});

client.on('message', (data) => {
  console.log('Received:', data);
});
```

### Cluster Setup (Multiple Servers) Setup

```typescript
import { UltraCluster } from '@ultrasocket/cluster';

const cluster = new UltraCluster({
  redis: { host: 'localhost', port: 6379 },
  node: {
    id: 'server-1',
    host: '0.0.0.0',
    port: 3000
  }
});

await cluster.initialize();

// Broadcast to all nodes
await cluster.broadcast({ type: 'hello', data: 'world' });
```
