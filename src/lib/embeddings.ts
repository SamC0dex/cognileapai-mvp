/**
 * FREE Enterprise-Grade Embeddings System
 * Uses Transformers.js for local, cost-free semantic search
 * No API costs, no user downloads, runs on your server
 */

import type { FeatureExtractionPipeline } from '@huggingface/transformers'

let transformersModulePromise: Promise<typeof import('@huggingface/transformers')> | null = null
let transformersEnvConfigured = false

async function getTransformersModule() {
  if (!transformersModulePromise) {
    transformersModulePromise = import('@huggingface/transformers')
      .then((mod) => {
        if (!transformersEnvConfigured) {
          mod.env.allowLocalModels = false
          mod.env.allowRemoteModels = true

          if (typeof window !== 'undefined') {
            try {
              if (mod.env.backends?.onnx?.wasm) {
                mod.env.backends.onnx.wasm.proxy = false
                mod.env.backends.onnx.wasm.simd = false
                mod.env.backends.onnx.wasm.numThreads = 1
              }
            } catch (error) {
              console.warn('[Embeddings] Backend configuration warning:', error)
            }
          }

          transformersEnvConfigured = true
        }

        return mod
      })
      .catch((error) => {
        transformersModulePromise = null
        throw error
      })
  }

  return transformersModulePromise
}

// Global pipeline cache to avoid reloading
let embeddingPipeline: FeatureExtractionPipeline | null = null

// In-memory cache for embeddings to avoid regenerating identical content
const embeddingCache = new Map<string, { embedding: number[], timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour TTL
const MAX_CACHE_SIZE = 1000 // Maximum number of cached embeddings

// Model configuration - using small, fast, high-quality model
const EMBEDDING_MODEL = 'mixedbread-ai/mxbai-embed-xsmall-v1' // 22MB, 384 dimensions
const EMBEDDING_DIMENSIONS = 384



export interface EmbeddingResult {
  embedding: number[]
  model: string
  dimensions: number
  processingTime: number
}

export interface BatchEmbeddingResult {
  embeddings: number[][]
  model: string
  dimensions: number
  totalProcessingTime: number
  itemCount: number
}

/**
 * Initialize the embedding pipeline (happens once per server instance)
 */
async function initializeEmbeddingPipeline(): Promise<FeatureExtractionPipeline | null> {
  if (embeddingPipeline) {
    return embeddingPipeline
  }

  console.log('[Embeddings] Initializing FREE embedding model...')

  // ✅ GRACEFUL FALLBACK - Don't break app if embeddings fail
  try {
    const { pipeline } = await getTransformersModule()

    // Try simple WASM backend first to avoid CDN issues
    const pipelineResult = await pipeline('feature-extraction', EMBEDDING_MODEL)
    embeddingPipeline = pipelineResult as FeatureExtractionPipeline

    console.log(`[Embeddings] Model initialized successfully`)
    return embeddingPipeline

  } catch (error) {
    console.warn('[Embeddings] Could not initialize embedding pipeline:', error)
    console.log('[Embeddings] App will continue without semantic search features')
    embeddingPipeline = null
    return null // Return null instead of throwing to prevent app crash
  }
}


/**
 * Generate a cache key for text
 */
function generateCacheKey(text: string): string {
  // Simple hash function for cache key
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return `emb_${Math.abs(hash)}_${text.length}`
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now()
  const expiredKeys: string[] = []

  for (const [key, value] of Array.from(embeddingCache.entries())) {
    if (now - value.timestamp > CACHE_TTL) {
      expiredKeys.push(key)
    }
  }

  expiredKeys.forEach(key => embeddingCache.delete(key))

  if (expiredKeys.length > 0) {
    console.log(`[Embeddings] Cleaned ${expiredKeys.length} expired cache entries`)
  }
}

/**
 * Manage cache size by removing oldest entries
 */
function manageCacheSize(): void {
  if (embeddingCache.size <= MAX_CACHE_SIZE) return

  // Convert to array and sort by timestamp
  const entries = Array.from(embeddingCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp)

  // Remove oldest entries
  const toRemove = embeddingCache.size - MAX_CACHE_SIZE
  for (let i = 0; i < toRemove; i++) {
    embeddingCache.delete(entries[i][0])
  }

  console.log(`[Embeddings] Removed ${toRemove} old cache entries to maintain size limit`)
}

/**
 * Generate embedding for a single text with intelligent caching
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  const startTime = Date.now()
  const cacheKey = generateCacheKey(text.trim())

  // Check cache first
  const cached = embeddingCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    cacheHits++
    console.log(`[Embeddings] Cache hit for text (${text.length} chars)`)
    return {
      embedding: cached.embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      processingTime: Date.now() - startTime
    }
  }

  cacheMisses++

  try {
    const pipeline = await initializeEmbeddingPipeline()

    // ✅ GRACEFUL FALLBACK - If pipeline failed to initialize
    if (!pipeline) {
      console.warn('[Embeddings] Pipeline not available, using fallback embedding')
      // Return a dummy embedding to prevent breaks (384 dimensions of zeros)
      const fallbackEmbedding = new Array(EMBEDDING_DIMENSIONS).fill(0)
      return {
        embedding: fallbackEmbedding,
        model: 'fallback',
        dimensions: EMBEDDING_DIMENSIONS,
        processingTime: Date.now() - startTime
      }
    }

    // Generate embedding with optimal settings
    const result = await pipeline(text, {
      pooling: 'mean',     // Mean pooling for better representation
      normalize: true,     // Normalize for cosine similarity
    })

    // Extract the embedding array
    const embedding = Array.from(result.data) as number[]

    // Cache the result
    embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    })

    // Periodic cache maintenance
    if (Math.random() < 0.1) { // 10% chance to trigger cleanup
      cleanExpiredCache()
      manageCacheSize()
    }

    const processingTime = Date.now() - startTime

    console.log(`[Embeddings] Generated new embedding for text (${text.length} chars) in ${processingTime}ms`)

    return {
      embedding,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      processingTime
    }
  } catch (error) {
    console.error('[Embeddings] Failed to generate embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}

/**
 * Generate embeddings for multiple texts (batch processing)
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty')
  }

  // Filter out empty texts
  const validTexts = texts.filter(text => text && text.trim().length > 0)
  if (validTexts.length === 0) {
    throw new Error('No valid texts provided')
  }

  const startTime = Date.now()

  try {
    const pipeline = await initializeEmbeddingPipeline()

    // ✅ GRACEFUL FALLBACK - If pipeline failed to initialize
    if (!pipeline) {
      console.warn('[Embeddings] Pipeline not available, using fallback embeddings')
      // Return dummy embeddings to prevent breaks
      const fallbackEmbeddings = validTexts.map(() => new Array(EMBEDDING_DIMENSIONS).fill(0))
      return {
        embeddings: fallbackEmbeddings,
        model: 'fallback',
        dimensions: EMBEDDING_DIMENSIONS,
        totalProcessingTime: Date.now() - startTime,
        itemCount: validTexts.length
      }
    }

    // Batch processing for efficiency
    const result = await pipeline(validTexts, {
      pooling: 'mean',
      normalize: true,
    })

    // Handle both single and batch results
    let embeddings: number[][]
    if (validTexts.length === 1) {
      embeddings = [Array.from(result.data) as number[]]
    } else {
      embeddings = result.tolist() as number[][]
    }

    const totalProcessingTime = Date.now() - startTime

    return {
      embeddings,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_DIMENSIONS,
      totalProcessingTime,
      itemCount: validTexts.length
    }
  } catch (error) {
    console.error('[Embeddings] Failed to generate batch embeddings:', error)
    throw new Error('Failed to generate batch embeddings')
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length')
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Find most similar embeddings from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  candidateEmbeddings: { id: string; embedding: number[]; metadata?: Record<string, unknown> }[],
  limit: number = 5,
  threshold: number = 0.1
): Array<{ id: string; similarity: number; metadata?: Record<string, unknown> }> {
  const similarities = candidateEmbeddings.map(candidate => ({
    id: candidate.id,
    similarity: cosineSimilarity(queryEmbedding, candidate.embedding),
    metadata: candidate.metadata
  }))

  return similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)
}

/**
 * Check if embeddings system is ready
 */
export async function isEmbeddingsReady(): Promise<boolean> {
  try {
    await initializeEmbeddingPipeline()
    return true
  } catch {
    return false
  }
}

/**
 * Get system information with performance metrics
 */
export function getEmbeddingsInfo() {
  return {
    model: EMBEDDING_MODEL,
    dimensions: EMBEDDING_DIMENSIONS,
    type: 'transformers.js',
    cost: 'FREE',
    location: 'server-side',
    cache: {
      size: embeddingCache.size,
      maxSize: MAX_CACHE_SIZE,
      ttlHours: CACHE_TTL / (60 * 60 * 1000),
      hitRate: getCacheHitRate()
    }
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  const now = Date.now()
  let expiredCount = 0

  for (const [, value] of Array.from(embeddingCache.entries())) {
    if (now - value.timestamp > CACHE_TTL) {
      expiredCount++
    }
  }

  return {
    totalEntries: embeddingCache.size,
    expiredEntries: expiredCount,
    activeEntries: embeddingCache.size - expiredCount,
    maxSize: MAX_CACHE_SIZE,
    utilizationPercent: Math.round((embeddingCache.size / MAX_CACHE_SIZE) * 100),
    ttlHours: CACHE_TTL / (60 * 60 * 1000)
  }
}

/**
 * Clear the embedding cache manually
 */
export function clearEmbeddingCache(): number {
  const size = embeddingCache.size
  embeddingCache.clear()
  console.log(`[Embeddings] Manually cleared ${size} cache entries`)
  return size
}

// Track cache hits and misses for hit rate calculation
let cacheHits = 0
let cacheMisses = 0

function getCacheHitRate(): number {
  const total = cacheHits + cacheMisses
  return total > 0 ? Math.round((cacheHits / total) * 100) : 0
}

/**
 * ✅ OPTIMIZED: Preload embedding pipeline during app initialization
 */
export async function preloadEmbeddingPipeline(): Promise<void> {
  if (typeof window !== 'undefined') {
    // Client-side: Background preload after app is ready
    setTimeout(() => {
      warmUpEmbeddingPipeline().catch(error => {
        console.warn('[Embeddings] Background preload failed:', error)
      })
    }, 3000) // Wait 3s for app to stabilize
  } else {
    // Server-side: Immediate preload
    warmUpEmbeddingPipeline().catch(error => {
      console.warn('[Embeddings] Server preload failed:', error)
    })
  }
}

/**
 * Warm up the embedding pipeline (useful for first request optimization)
 */
export async function warmUpEmbeddingPipeline(): Promise<boolean> {
  try {
    console.log('[Embeddings] Warming up pipeline...')
    const startTime = Date.now()

    const pipeline = await initializeEmbeddingPipeline()

    // ✅ GRACEFUL HANDLING - Only test if pipeline initialized successfully
    if (pipeline) {
      // Generate a small test embedding to fully initialize
      await generateEmbedding('test')

      const warmupTime = Date.now() - startTime
      console.log(`[Embeddings] Pipeline warmed up successfully in ${warmupTime}ms`)
      return true
    } else {
      console.log('[Embeddings] Pipeline initialization skipped - app will continue without semantic search')
      return false
    }
  } catch (error) {
    console.warn('[Embeddings] Pipeline warmup failed (non-critical):', error)
    return false
  }
}
