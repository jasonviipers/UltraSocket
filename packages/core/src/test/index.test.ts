import { describe, test } from "node:test"
import { expect } from "chai"
import { UltraServer } from "../server"
import { encodeMessage, decodeMessage } from "../protocol"

describe("UltraServer", () => {
  test("should create server instance", () => {
    const server = new UltraServer({ port: 3000 })
    expect(server).to.not.be.undefined
    expect(server).to.not.be.null
  })

  test("should register event handlers", () => {
    const server = new UltraServer({ port: 3000 })
    const handler = () => {}
    server.on("test", handler)
    expect(server).to.not.be.undefined
  })

  test("should get initial stats", () => {
    const server = new UltraServer({ port: 3000 })
    const stats = server.getStats()
    expect(stats.connections).to.equal(0)
    expect(stats.messagesReceived).to.equal(0)
    expect(stats.messagesSent).to.equal(0)
  })
})

describe("Protocol", () => {
  test("should encode and decode messages", () => {
    const event = "test"
    const data = { hello: "world", count: 42 }

    const encoded = encodeMessage(event, data)
    const decoded = decodeMessage(encoded)

    expect(decoded.event).to.equal(event)
    expect(decoded.data).to.deep.equal(data)
  })

  test("should handle empty data", () => {
    const event = "ping"
    const data = undefined

    const encoded = encodeMessage(event, data)
    const decoded = decodeMessage(encoded)

    expect(decoded.event).to.equal(event)
    expect(decoded.data).to.be.undefined
  })
})