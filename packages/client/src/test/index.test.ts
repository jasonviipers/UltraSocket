import { describe, it } from "node:test";
import { expect } from "chai";
import { UltraClient } from "../client";
import { decodeMessage, encodeMessage } from "../protocol";

describe("UltraClient", () => {
  it("should create client instance", () => {
    const client = new UltraClient("ws://localhost:3000");
    expect(client).to.exist;
    expect(client.connected).to.be.false;
  });

  it("should register event handlers", () => {
    const client = new UltraClient("ws://localhost:3000");
    const handler = () => {};
    client.on("test", handler);
    expect(client).to.exist;
  });

  it("should get initial state", () => {
    const client = new UltraClient("ws://localhost:3000");
    const state = client.getState();
    expect(state.connected).to.be.false;
    expect(state.connecting).to.be.false;
    expect(state.reconnecting).to.be.false;
  });

  it("should get initial stats", () => {
    const client = new UltraClient("ws://localhost:3000");
    const stats = client.getStats();
    expect(stats.messagesSent).to.equal(0);
    expect(stats.messagesReceived).to.equal(0);
  });

  it("should accept string URL", () => {
    const client = new UltraClient("ws://localhost:3000");
    expect(client).to.exist;
  });

  it("should accept options object", () => {
    const client = new UltraClient({
      url: "ws://localhost:3000",
      autoReconnect: false,
      debug: true,
    });
    expect(client).to.exist;
  });
});

describe("Protocol", () => {
  it("should encode and decode messages", () => {
    const event = "test";
    const data = { hello: "world", count: 42 };

    const encoded = encodeMessage(event, data);
    const decoded = decodeMessage(encoded);

    expect(decoded.event).to.equal(event);
    expect(decoded.data).to.deep.equal(data);
  });
});