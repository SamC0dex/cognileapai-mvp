/**
 * Token Counting Service with Gemini API Integration
 * Provides accurate token counting using Google GenAI SDK's countTokens API
 * with intelligent caching and fallback to estimates
 */

import { GoogleGenAI } from '@google/genai'
import type { Content } from '@google/genai'

// Cache entry interface
interface TokenCountCacheEntry {
  totalTokens: number
  timestamp: Date
  method: 'api_count' | 'estimation'
}

// Token count result
export interface TokenCountResult {
  totalTokens: number
  method: 'api_count' | 'estimation'
  cached: boolean
  timestamp: Date
}

// Token counting parameters
interface CountTokensParams {
  model: string
  content: string | Content[]
  systemInstruction?: string
}

// Batch counting item
interface BatchCountItem {
  key: string
  params: CountTokensParams
}

/**
 * Token Counting Service
 * Uses Gemini's countTokens API for accurate token counting with intelligent caching
 */
class TokenCountingService {
  private client: GoogleGenAI | null = null
  private cache: Map<string, TokenCountCacheEntry>
  private readonly CACHE_TTL = 60 * 60 * 1000 // 1 hour
  private readonly MAX_CACHE_SIZE = 1000

  constructor() {
    this.cache = new Map()
    this.initClient()
  }

  private initClient() {
    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (!apiKey) {
        console.warn('[TokenCounter] Gemini API key not found, will use estimates')
        return
      }

      this.client = new GoogleGenAI({ apiKey })
      console.log('[TokenCounter] Initialized with Gemini API')
    } catch (error) {
      console.error('[TokenCounter] Failed to initialize client:', error)
    }
  }

  /**
   * Generate cache key from params
   */
  private getCacheKey(params: CountTokensParams): string {
    const contentStr = typeof params.content === 'string'
      ? params.content
      : JSON.stringify(params.content)

    const hash = this.simpleHash(contentStr + (params.systemInstruction || ''))
    return `${params.model}:${hash}`
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Check if cache entry is valid
   */
  private isCacheValid(entry: TokenCountCacheEntry): boolean {
    const age = Date.now() - entry.timestamp.getTime()
    return age < this.CACHE_TTL
  }

  /**
   * Evict oldest entries if cache is too large
   */
  private evictOldEntries() {
    if (this.cache.size <= this.MAX_CACHE_SIZE) return

    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime())

    const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE)
    toRemove.forEach(([key]) => this.cache.delete(key))

    console.log(`[TokenCounter] Evicted ${toRemove.length} old cache entries`)
  }

  /**
   * Wrap promise with timeout to prevent hanging
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
    return Promise.race([promise, timeoutPromise])
  }

  /**
   * Fallback: Estimate tokens using character-based method
   */
  private estimateTokens(content: string | Content[]): TokenCountResult {
    const text = typeof content === 'string'
      ? content
      : JSON.stringify(content)

    const charCount = text.length
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length

    // Use multiple estimation methods and average (same as token-manager.ts)
    const charBasedTokens = Math.ceil(charCount / 4)
    const wordBasedTokens = Math.ceil(wordCount / 0.75)
    const estimated = Math.round((charBasedTokens * 0.7) + (wordBasedTokens * 0.3))

    return {
      totalTokens: estimated,
      method: 'estimation',
      cached: false,
      timestamp: new Date()
    }
  }

  /**
   * Count tokens using Gemini API
   */
  async countTokens(params: CountTokensParams): Promise<TokenCountResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(params)
      const cached = this.cache.get(cacheKey)

      if (cached && this.isCacheValid(cached)) {
        console.log(`[TokenCounter] Cache hit for ${cacheKey}`)
        return {
          ...cached,
          cached: true
        }
      }

      // If no client, fall back to estimation
      if (!this.client) {
        console.log('[TokenCounter] No API client, using estimation')
        return this.estimateTokens(params.content)
      }

      // Prepare content for API
      let contents: string | Content[]
      if (typeof params.content === 'string') {
        contents = params.content
      } else {
        contents = params.content
      }

      // Call Gemini API with 5-second timeout
      const response = await this.withTimeout(
        this.client.models.countTokens({
          model: params.model,
          contents,
          config: params.systemInstruction ? {
            systemInstruction: params.systemInstruction
          } : undefined
        }),
        5000,
        'Token counting timeout - falling back to estimation'
      )

      const result: TokenCountResult = {
        totalTokens: response.totalTokens || 0,
        method: 'api_count',
        cached: false,
        timestamp: new Date()
      }

      // Cache the result
      this.cache.set(cacheKey, {
        totalTokens: result.totalTokens,
        timestamp: result.timestamp,
        method: 'api_count'
      })

      // Evict old entries if needed
      this.evictOldEntries()

      console.log(`[TokenCounter] API count: ${result.totalTokens} tokens (${params.model})`)
      return result

    } catch (error) {
      console.error('[TokenCounter] API call failed, using estimation:', error)
      return this.estimateTokens(params.content)
    }
  }

  /**
   * Count tokens with explicit caching (for stable content like documents)
   */
  async countTokensCached(
    cacheKey: string,
    params: CountTokensParams
  ): Promise<TokenCountResult> {
    // Check if we have a cached result for this explicit key
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      console.log(`[TokenCounter] Explicit cache hit for ${cacheKey}`)
      return {
        ...cached,
        cached: true
      }
    }

    // Count using API
    const result = await this.countTokens(params)

    // Store with explicit key (in addition to hash-based key)
    this.cache.set(cacheKey, {
      totalTokens: result.totalTokens,
      timestamp: result.timestamp,
      method: result.method
    })

    return result
  }

  /**
   * Batch count tokens for multiple items
   * Processes items sequentially to avoid rate limits
   */
  async batchCountTokens(
    items: BatchCountItem[]
  ): Promise<Map<string, TokenCountResult>> {
    const results = new Map<string, TokenCountResult>()

    console.log(`[TokenCounter] Batch counting ${items.length} items`)

    for (const item of items) {
      try {
        const result = await this.countTokens(item.params)
        results.set(item.key, result)

        // Small delay to avoid rate limiting
        if (items.length > 5) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`[TokenCounter] Failed to count tokens for ${item.key}:`, error)
        // Set estimation as fallback
        const fallback = this.estimateTokens(item.params.content)
        results.set(item.key, fallback)
      }
    }

    console.log(`[TokenCounter] Batch completed: ${results.size} results`)
    return results
  }

  /**
   * Clear cache (useful for testing or memory management)
   */
  clearCache() {
    this.cache.clear()
    console.log('[TokenCounter] Cache cleared')
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.values())
    const validEntries = entries.filter(e => this.isCacheValid(e))
    const apiCounts = validEntries.filter(e => e.method === 'api_count').length
    const estimates = validEntries.filter(e => e.method === 'estimation').length

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      apiCounts,
      estimates,
      cacheHitRate: this.cache.size > 0
        ? (validEntries.length / this.cache.size * 100).toFixed(1) + '%'
        : '0%'
    }
  }
}

// Singleton instance
let tokenCounterInstance: TokenCountingService | null = null

/**
 * Get the token counter singleton instance
 */
export function getTokenCounter(): TokenCountingService {
  if (!tokenCounterInstance) {
    tokenCounterInstance = new TokenCountingService()
  }
  return tokenCounterInstance
}

/**
 * Helper function: Count tokens for simple text content
 */
export async function countTextTokens(
  model: string,
  text: string,
  systemInstruction?: string
): Promise<TokenCountResult> {
  const counter = getTokenCounter()
  return counter.countTokens({
    model,
    content: text,
    systemInstruction
  })
}

/**
 * Helper function: Count tokens for document content with caching
 */
export async function countDocumentTokens(
  documentId: string,
  model: string,
  content: string
): Promise<TokenCountResult> {
  const counter = getTokenCounter()
  const cacheKey = `doc:${documentId}:${model}`
  return counter.countTokensCached(cacheKey, {
    model,
    content
  })
}

/**
 * Helper function: Count tokens for system prompt with caching
 */
export async function countSystemPromptTokens(
  model: string,
  systemPrompt: string
): Promise<TokenCountResult> {
  const counter = getTokenCounter()
  return counter.countTokens({
    model,
    content: '',
    systemInstruction: systemPrompt
  })
}

/**
 * Export the service class for direct instantiation if needed
 */
export { TokenCountingService }
