/**
 * Binary protocol implementation for UltraSocket client
 * Matches the server protocol format
 */
import { serialize, deserialize } from 'superjson'

export enum MessageType {
  EVENT = 0x01,
  PING = 0x02,
  PONG = 0x03,
  ERROR = 0x04,
}

export interface ParsedMessage {
  type: MessageType
  event?: string
  data?: unknown
}

// Reuse encoder/decoder instances for better performance
const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Encode a message to binary format
 */
export function encodeMessage(event: string, data: unknown): ArrayBuffer {
  const eventBytes = encoder.encode(event)

  if (eventBytes.length > 0xFFFF) {
    throw new Error(`Event name too long: ${eventBytes.length} bytes (max 65535)`)
  }

  const serialized = serialize(data)
  const dataJson = JSON.stringify(serialized)
  const dataBytes = encoder.encode(dataJson)

  const buffer = new ArrayBuffer(1 + 2 + eventBytes.length + dataBytes.length)
  const view = new DataView(buffer)
  const uint8 = new Uint8Array(buffer)

  let offset = 0

  // Message type
  view.setUint8(offset, MessageType.EVENT)
  offset += 1

  // Event length (2 bytes)
  view.setUint16(offset, eventBytes.length, false)
  offset += 2

  // Event name
  uint8.set(eventBytes, offset)
  offset += eventBytes.length

  // Data
  uint8.set(dataBytes, offset)

  return buffer
}

/**
 * Decode a binary message
 */
export function decodeMessage(buffer: ArrayBuffer): ParsedMessage {
  if (buffer.byteLength < 1) {
    throw new Error('Invalid message: buffer too small')
  }

  const view = new DataView(buffer)
  const uint8 = new Uint8Array(buffer)
  let offset = 0

  // Message type
  const type = view.getUint8(offset) as MessageType
  offset += 1

  if (!Object.values(MessageType).includes(type)) {
    throw new Error(`Invalid message type: ${type}`)
  }

  if (type === MessageType.PING || type === MessageType.PONG) {
    return { type }
  }

  if (type === MessageType.ERROR) {
    const errorBytes = uint8.slice(offset)
    const errorMessage = decoder.decode(errorBytes)
    return { type, data: errorMessage }
  }

  if (buffer.byteLength < 3) {
    throw new Error('Invalid EVENT message: missing event length')
  }

  // Event length
  const eventLength = view.getUint16(offset, false)
  offset += 2

  if (buffer.byteLength < 3 + eventLength) {
    throw new Error('Invalid EVENT message: truncated event name')
  }

  // Event name
  const eventBytes = uint8.slice(offset, offset + eventLength)
  const event = decoder.decode(eventBytes)
  offset += eventLength

  // Data
  const dataBytes = uint8.slice(offset)
  const dataJson = decoder.decode(dataBytes)

  let data: unknown
  try {
    if (dataJson.length > 0) {
      const serialized = JSON.parse(dataJson)
      data = deserialize(serialized)
    } else {
      data = undefined
    }
  } catch (e) {
    throw new Error(`Invalid SuperJSON data: ${e instanceof Error ? e.message : 'unknown error'}`)
  }

  return { type, event, data }
}

/**
 * Create a ping message
 */
export function createPing(): ArrayBuffer {
  const buffer = new ArrayBuffer(1)
  const view = new DataView(buffer)
  view.setUint8(0, MessageType.PING)
  return buffer
}

/**
 * Create a pong message
 */
export function createPong(): ArrayBuffer {
  const buffer = new ArrayBuffer(1)
  const view = new DataView(buffer)
  view.setUint8(0, MessageType.PONG)
  return buffer
}

/**
 * Create an error message
 */
export function encodeError(message: string): ArrayBuffer {
  const msgBytes = encoder.encode(message)
  const buffer = new ArrayBuffer(1 + msgBytes.length)
  const view = new DataView(buffer)
  const uint8 = new Uint8Array(buffer)

  view.setUint8(0, MessageType.ERROR)
  uint8.set(msgBytes, 1)

  return buffer
}

/**
 * Check if message is binary protocol
 */
export function isBinaryProtocol(data: ArrayBuffer): boolean {
  if (data.byteLength < 1) {
    return false
  }
  const view = new DataView(data)
  const type = view.getUint8(0)
  return (
    type === MessageType.EVENT ||
    type === MessageType.PING ||
    type === MessageType.PONG ||
    type === MessageType.ERROR
  )
}