/**
 * Offline message queue for UltraSocket client
 */

interface QueuedMessage {
    event: string
    data: unknown
    timestamp: number
  }
  
  export class MessageQueue {
    private queue: QueuedMessage[] = []
    private maxSize: number
  
    constructor(maxSize = 1000) {
      this.maxSize = maxSize
    }
  
    /**
     * Add message to queue
     */
    enqueue(event: string, data: unknown): void {
      if (this.queue.length >= this.maxSize) {
        this.queue.shift()
      }
  
      this.queue.push({
        event,
        data,
        timestamp: Date.now(),
      })
    }
  
    /**
     * Get all queued messages and clear queue
     */
    flush(): QueuedMessage[] {
      const messages = [...this.queue]
      this.queue = []
      return messages
    }
  
    /**
     * Get queue size
     */
    size(): number {
      return this.queue.length
    }
  
    /**
     * Clear queue
     */
    clear(): void {
      this.queue = []
    }
  
    /**
     * Check if queue is empty
     */
    isEmpty(): boolean {
      return this.queue.length === 0
    }
  }
  