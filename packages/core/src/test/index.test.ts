import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UltraServer } from "../server";
import { decodeMessage, encodeMessage } from "../protocol";

describe("UltraServer", () => {
  it("should create server instance", () => {
    const server = new UltraServer({ port: 3000 });
    assert(server !== undefined && server !== null);
  });

  it("should register event handlers", () => {
    const server = new UltraServer({ port: 3000 });
    const handler = () => {};
    server.on("test", handler);
    assert(server !== undefined && server !== null);
  });

  it("should get initial stats", () => {
    const server = new UltraServer({ port: 3000 });
    const stats = server.getStats();
    assert.strictEqual(stats.connections, 0);
    assert.strictEqual(stats.messagesReceived, 0);
    assert.strictEqual(stats.messagesSent, 0);
  });
});

describe("Protocol", () => {
  it("should encode and decode messages", () => {
    const event = "test";
    const data = { hello: "world", count: 42 };

    const encoded = encodeMessage(event, data);
    const decoded = decodeMessage(encoded);

    assert.strictEqual(decoded.event, event);
    assert.deepStrictEqual(decoded.data, data);
  });

  it("should handle empty data", () => {
    const event = "ping";
    const data = undefined;

    const encoded = encodeMessage(event, data);
    const decoded = decodeMessage(encoded);

    assert.strictEqual(decoded.event, event);
    assert.strictEqual(decoded.data, undefined);
  });
});