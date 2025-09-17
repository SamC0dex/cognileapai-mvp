/**
 * Enterprise-Grade Background Retry Manager
 * Handles API failures with intelligent retry logic and beautiful UI feedback
 */

export interface RetryAttempt {
  id: string
  taskType: 'chat' | 'study-tool-generation' | 'document-processing'
  originalPayload: any
  maxRetries: number
  currentAttempt: number
  nextRetryAt: Date
  lastError?: string
  status: 'pending' | 'retrying' | 'success' | 'failed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
}

export interface RetryManagerOptions {
  baseDelayMs?: number // Base delay between retries (default: 15000ms = 15 seconds)
  maxDelayMs?: number   // Maximum delay (default: 300000ms = 5 minutes)
  maxRetries?: number   // Maximum retry attempts (default: 10)
  exponentialBackoff?: boolean // Use exponential backoff (default: true)
  jitterMs?: number     // Add random jitter to prevent thundering herd (default: 5000ms)
}

export interface RetryableError {
  isRetryable: boolean
  retryAfterMs?: number
  reason?: string
}

class BackgroundRetryManager {
  private static instance: BackgroundRetryManager
  private retryQueue: Map<string, RetryAttempt> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private listeners: Set<(attempts: RetryAttempt[]) => void> = new Set()
  private isRunning = false

  private readonly options: Required<RetryManagerOptions> = {
    baseDelayMs: 15000,      // 15 seconds
    maxDelayMs: 300000,      // 5 minutes
    maxRetries: 10,          // 10 attempts
    exponentialBackoff: true,
    jitterMs: 5000           // 5 seconds jitter
  }

  static getInstance(): BackgroundRetryManager {
    if (!BackgroundRetryManager.instance) {
      BackgroundRetryManager.instance = new BackgroundRetryManager()
    }
    return BackgroundRetryManager.instance
  }

  /**
   * Initialize the retry manager (call this on app startup)
   */
  initialize(options?: Partial<RetryManagerOptions>): void {
    Object.assign(this.options, options)
    this.isRunning = true
    this.loadPersistedAttempts()
    console.log('[RetryManager] Initialized with options:', this.options)
  }

  /**
   * Add a failed task to the retry queue
   */
  addRetryAttempt(
    taskType: RetryAttempt['taskType'],
    originalPayload: any,
    error: Error,
    options?: Partial<RetryManagerOptions>
  ): string {
    const id = this.generateId()
    const attemptOptions = { ...this.options, ...options }

    const attempt: RetryAttempt = {
      id,
      taskType,
      originalPayload,
      maxRetries: attemptOptions.maxRetries,
      currentAttempt: 0,
      nextRetryAt: new Date(Date.now() + attemptOptions.baseDelayMs),
      lastError: error.message,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.retryQueue.set(id, attempt)
    this.scheduleRetry(attempt)
    this.persistAttempts()
    this.notifyListeners()

    console.log(`[RetryManager] Added ${taskType} task to retry queue: ${id}`)
    return id
  }

  /**
   * Cancel a retry attempt
   */
  cancelRetry(id: string): boolean {
    const attempt = this.retryQueue.get(id)
    if (!attempt) return false

    attempt.status = 'cancelled'
    attempt.updatedAt = new Date()

    // Clear timer
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }

    this.persistAttempts()
    this.notifyListeners()

    console.log(`[RetryManager] Cancelled retry attempt: ${id}`)
    return true
  }

  /**
   * Get all active retry attempts
   */
  getActiveAttempts(): RetryAttempt[] {
    return Array.from(this.retryQueue.values())
      .filter(attempt => ['pending', 'retrying'].includes(attempt.status))
      .sort((a, b) => a.nextRetryAt.getTime() - b.nextRetryAt.getTime())
  }

  /**
   * Get all retry attempts (including completed ones)
   */
  getAllAttempts(): RetryAttempt[] {
    return Array.from(this.retryQueue.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  /**
   * Subscribe to retry attempt updates
   */
  subscribe(listener: (attempts: RetryAttempt[]) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Clear completed retry attempts (older than 24 hours)
   */
  clearOldAttempts(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
    let cleared = 0

    for (const [id, attempt] of this.retryQueue.entries()) {
      if (['success', 'failed', 'cancelled'].includes(attempt.status) &&
          attempt.updatedAt < cutoff) {
        this.retryQueue.delete(id)
        cleared++
      }
    }

    if (cleared > 0) {
      this.persistAttempts()
      this.notifyListeners()
      console.log(`[RetryManager] Cleared ${cleared} old retry attempts`)
    }
  }

  /**
   * Classify error as retryable or not
   */
  static classifyError(error: Error): RetryableError {
    const message = error.message.toLowerCase()

    // API rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return { isRetryable: true, retryAfterMs: 60000, reason: 'Rate limited' }
    }

    // Network/connectivity issues
    if (message.includes('network') || message.includes('connection') ||
        message.includes('timeout') || message.includes('fetch')) {
      return { isRetryable: true, reason: 'Network error' }
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') ||
        message.includes('503') || message.includes('504')) {
      return { isRetryable: true, reason: 'Server error' }
    }

    // API key or authentication issues
    if (message.includes('unauthorized') || message.includes('forbidden') ||
        message.includes('api key') || message.includes('authentication')) {
      return { isRetryable: false, reason: 'Authentication error' }
    }

    // Client errors (4xx) - generally not retryable
    if (message.includes('400') || message.includes('404') ||
        message.includes('bad request')) {
      return { isRetryable: false, reason: 'Client error' }
    }

    // Default: retry for unknown errors
    return { isRetryable: true, reason: 'Unknown error' }
  }

  private scheduleRetry(attempt: RetryAttempt): void {
    const delay = attempt.nextRetryAt.getTime() - Date.now()

    const timer = setTimeout(() => {
      this.executeRetry(attempt.id)
    }, Math.max(0, delay))

    this.timers.set(attempt.id, timer)
  }

  private async executeRetry(id: string): Promise<void> {
    const attempt = this.retryQueue.get(id)
    if (!attempt || attempt.status !== 'pending') return

    attempt.status = 'retrying'
    attempt.currentAttempt++
    attempt.updatedAt = new Date()
    this.notifyListeners()

    console.log(`[RetryManager] Executing retry ${attempt.currentAttempt}/${attempt.maxRetries} for ${attempt.taskType}: ${id}`)

    try {
      let success = false

      // Execute the appropriate retry function based on task type
      switch (attempt.taskType) {
        case 'chat':
          success = await this.retryChatTask(attempt.originalPayload)
          break
        case 'study-tool-generation':
          success = await this.retryStudyToolTask(attempt.originalPayload)
          break
        case 'document-processing':
          success = await this.retryDocumentTask(attempt.originalPayload)
          break
      }

      if (success) {
        attempt.status = 'success'
        attempt.updatedAt = new Date()
        console.log(`[RetryManager] Retry successful for ${attempt.taskType}: ${id}`)
      } else {
        throw new Error('Retry execution returned false')
      }

    } catch (error) {
      attempt.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (attempt.currentAttempt >= attempt.maxRetries) {
        attempt.status = 'failed'
        console.log(`[RetryManager] Max retries exceeded for ${attempt.taskType}: ${id}`)
      } else {
        attempt.status = 'pending'
        attempt.nextRetryAt = this.calculateNextRetry(attempt)
        this.scheduleRetry(attempt)
        console.log(`[RetryManager] Retry failed, next attempt at ${attempt.nextRetryAt.toLocaleTimeString()}`)
      }
    }

    this.timers.delete(id)
    this.persistAttempts()
    this.notifyListeners()
  }

  private calculateNextRetry(attempt: RetryAttempt): Date {
    let delay = this.options.baseDelayMs

    if (this.options.exponentialBackoff) {
      delay = Math.min(
        this.options.baseDelayMs * Math.pow(2, attempt.currentAttempt - 1),
        this.options.maxDelayMs
      )
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * this.options.jitterMs
    delay += jitter

    return new Date(Date.now() + delay)
  }

  private async retryChatTask(payload: any): Promise<boolean> {
    // Import chat functionality dynamically to avoid circular dependencies
    const { useChatStore } = await import('./chat-store')

    try {
      // This would trigger the chat API call again
      const store = useChatStore.getState()
      await store.sendMessage(payload.message, payload.documentId, payload.conversationId)
      return true
    } catch (error) {
      console.error('[RetryManager] Chat retry failed:', error)
      return false
    }
  }

  private async retryStudyToolTask(payload: any): Promise<boolean> {
    // Import study tools functionality dynamically
    const { useStudyToolsStore } = await import('./study-tools-store')

    try {
      const store = useStudyToolsStore.getState()
      await store.generateStudyTool(
        payload.type,
        payload.documentId,
        payload.conversationId,
        payload.options
      )
      return true
    } catch (error) {
      console.error('[RetryManager] Study tool retry failed:', error)
      return false
    }
  }

  private async retryDocumentTask(payload: any): Promise<boolean> {
    try {
      // Retry document processing by calling the API again
      const response = await fetch('/api/extract-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      return response.ok
    } catch (error) {
      console.error('[RetryManager] Document processing retry failed:', error)
      return false
    }
  }

  private generateId(): string {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private persistAttempts(): void {
    try {
      const attempts = Array.from(this.retryQueue.entries())
      localStorage.setItem('retry_attempts', JSON.stringify(attempts))
    } catch (error) {
      console.warn('[RetryManager] Failed to persist attempts:', error)
    }
  }

  private loadPersistedAttempts(): void {
    try {
      const stored = localStorage.getItem('retry_attempts')
      if (stored) {
        const attempts: [string, any][] = JSON.parse(stored)

        for (const [id, attemptData] of attempts) {
          // Convert date strings back to Date objects
          const attempt: RetryAttempt = {
            ...attemptData,
            nextRetryAt: new Date(attemptData.nextRetryAt),
            createdAt: new Date(attemptData.createdAt),
            updatedAt: new Date(attemptData.updatedAt)
          }

          this.retryQueue.set(id, attempt)

          // Reschedule pending retries
          if (attempt.status === 'pending') {
            this.scheduleRetry(attempt)
          }
        }

        console.log(`[RetryManager] Loaded ${attempts.length} persisted retry attempts`)
      }
    } catch (error) {
      console.warn('[RetryManager] Failed to load persisted attempts:', error)
    }
  }

  private notifyListeners(): void {
    const attempts = this.getAllAttempts()
    this.listeners.forEach(listener => {
      try {
        listener(attempts)
      } catch (error) {
        console.warn('[RetryManager] Listener error:', error)
      }
    })
  }
}

// Export singleton instance
export const retryManager = BackgroundRetryManager.getInstance()

// Export helper functions
export const addRetryAttempt = (
  taskType: RetryAttempt['taskType'],
  payload: any,
  error: Error,
  options?: Partial<RetryManagerOptions>
) => retryManager.addRetryAttempt(taskType, payload, error, options)

export const cancelRetry = (id: string) => retryManager.cancelRetry(id)
export const getActiveRetries = () => retryManager.getActiveAttempts()
export const subscribeToRetries = (listener: (attempts: RetryAttempt[]) => void) =>
  retryManager.subscribe(listener)
export const classifyError = BackgroundRetryManager.classifyError