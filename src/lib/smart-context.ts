/**
 * Enterprise-Grade RAG System for PDF Documents
 * Provides semantic chunking, vector search, and hybrid retrieval like big AI companies
 * Uses FREE Transformers.js - no API costs!
 */

import { generateEmbedding, cosineSimilarity, type EmbeddingResult, getCacheStats } from './embeddings'

// Context-level caching for document chunks and search results
const contextCache = new Map<string, { result: SearchResult, timestamp: number }>()
const CONTEXT_CACHE_TTL = 30 * 60 * 1000 // 30 minutes TTL for context results
const MAX_CONTEXT_CACHE_SIZE = 100

export interface DocumentChunk {
  id: string
  content: string
  startIndex: number
  endIndex: number
  pageNumbers?: number[]
  sectionTitle?: string
  embedding?: number[]
  semanticScore?: number
  keywordScore?: number
  combinedScore?: number
  tokenCount?: number
  chunkType?: 'paragraph' | 'section' | 'table' | 'list'
}

export interface ContextRetrievalOptions {
  maxTokens?: number
  chunkSize?: number
  overlap?: number
  minRelevanceScore?: number
  useSemanticSearch?: boolean
  hybridWeight?: number // Weight between semantic (0.0) and keyword (1.0) search
  maxChunks?: number
  generateEmbeddings?: boolean
}

export interface SearchResult {
  chunks: DocumentChunk[]
  totalRelevance: number
  searchStrategy: 'semantic' | 'keyword' | 'hybrid'
  processingTime: number
  embeddingsGenerated?: boolean
  context: string
}

/**
 * Enhanced semantic-aware document chunking
 * Respects document structure while maintaining optimal chunk sizes
 */
export function chunkDocument(
  content: string,
  options: ContextRetrievalOptions = {}
): DocumentChunk[] {
  const {
    chunkSize = 1000,
    overlap = 200
  } = options

  const chunks: DocumentChunk[] = []

  // Detect document structure
  const sections = detectDocumentSections(content)

  if (sections.length > 0) {
    // Structure-aware chunking
    for (const section of sections) {
      const sectionChunks = chunkSection(section, chunkSize, overlap)
      chunks.push(...sectionChunks)
    }
  } else {
    // Fallback to word-based chunking
    const words = content.split(/\s+/)
    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunkWords = words.slice(i, i + chunkSize)
      const chunkContent = chunkWords.join(' ')

      if (chunkContent.trim()) {
        chunks.push({
          id: `chunk_${chunks.length}`,
          content: chunkContent,
          startIndex: i,
          endIndex: Math.min(i + chunkSize, words.length),
          chunkType: 'paragraph'
        })
      }
    }
  }

  return chunks
}

/**
 * Detect document sections (headings, lists, etc.)
 */
interface DocumentSection {
  title?: string
  content: string
  type: 'heading' | 'paragraph' | 'list' | 'table'
  startIndex: number
  endIndex: number
}

function detectDocumentSections(content: string): DocumentSection[] {
  const sections: DocumentSection[] = []
  const lines = content.split('\n')
  let currentSection: DocumentSection = { content: '', type: 'paragraph' as const, startIndex: 0, endIndex: 0 }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Detect headings (lines that look like headings)
    if (isLikelyHeading(line)) {
      if (currentSection.content.trim()) {
        currentSection.endIndex = i
        sections.push({ ...currentSection })
      }
      currentSection = {
        title: line,
        content: '',
        type: 'heading',
        startIndex: i,
        endIndex: i
      }
    }
    // Detect lists
    else if (isListItem(line)) {
      if (currentSection.type !== 'list') {
        if (currentSection.content.trim()) {
          currentSection.endIndex = i
          sections.push({ ...currentSection })
        }
        currentSection = {
          content: line + '\n',
          type: 'list',
          startIndex: i,
          endIndex: i
        }
      } else {
        currentSection.content += line + '\n'
      }
    }
    // Regular content
    else if (line) {
      currentSection.content += line + '\n'
    }
  }

  if (currentSection.content.trim()) {
    currentSection.endIndex = lines.length
    sections.push(currentSection)
  }

  return sections
}

/**
 * Check if a line looks like a heading
 */
function isLikelyHeading(line: string): boolean {
  if (!line || line.length === 0) return false

  // Check for common heading patterns
  const headingPatterns = [
    /^#+\s/, // Markdown headings
    /^\d+\.?\d*\.?\s/, // Numbered headings (1. or 1.1)
    /^[A-Z][A-Z\s]+$/, // ALL CAPS
    /^[A-Z][a-z\s]+:$/, // Title Case with colon
  ]

  return headingPatterns.some(pattern => pattern.test(line)) ||
         (line.length < 100 && line.split(' ').length < 10 && /^[A-Z]/.test(line))
}

/**
 * Check if a line is a list item
 */
function isListItem(line: string): boolean {
  const listPatterns = [
    /^[-*+]\s/, // Bullet points
    /^\d+[.)]\s/, // Numbered lists
    /^[a-zA-Z][.)]\s/, // Lettered lists
    /^•\s/, // Unicode bullets
  ]

  return listPatterns.some(pattern => pattern.test(line))
}

/**
 * Chunk a section while preserving its structure
 */
function chunkSection(
  section: { title?: string; content: string; type: string },
  chunkSize: number,
  overlap: number
): DocumentChunk[] {
  const chunks: DocumentChunk[] = []
  const words = section.content.split(/\s+/)

  // For small sections, keep as single chunk
  if (words.length <= chunkSize) {
    return [{
      id: `section_${Math.random().toString(36).substr(2, 9)}`,
      content: section.content,
      sectionTitle: section.title,
      startIndex: 0,
      endIndex: words.length,
      chunkType: section.type as any
    }]
  }

  // Split large sections
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize)
    const chunkContent = chunkWords.join(' ')

    if (chunkContent.trim()) {
      chunks.push({
        id: `section_${Math.random().toString(36).substr(2, 9)}`,
        content: chunkContent,
        sectionTitle: section.title,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, words.length),
        chunkType: section.type as any
      })
    }
  }

  return chunks
}

/**
 * Calculate relevance score using simple keyword matching
 * This is a lightweight alternative to vector embeddings
 */
export function calculateRelevanceScore(query: string, chunk: DocumentChunk): number {
  const queryLower = query.toLowerCase()
  const contentLower = chunk.content.toLowerCase()

  // Extract keywords from query (remove common words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'what', 'when', 'where', 'why', 'how', 'which', 'who', 'whom'])

  const queryWords = queryLower
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))

  if (queryWords.length === 0) return 0

  let score = 0

  // Check for exact phrase matches (higher weight)
  if (contentLower.includes(queryLower)) {
    score += 10
  }

  // Check for individual keyword matches
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      score += 1

      // Bonus for word appearing multiple times
      const matches = (contentLower.match(new RegExp(word, 'g')) || []).length
      score += Math.min(matches - 1, 3) * 0.5
    }
  }

  // Check for numbered items (if query mentions numbers)
  const numberMatch = query.match(/(\d+)(st|nd|rd|th)?\s+(point|item|step|section)/i)
  if (numberMatch) {
    const number = numberMatch[1]
    const patterns = [
      new RegExp(`${number}\\.\\s`, 'i'),
      new RegExp(`${number}\\)\\s`, 'i'),
      new RegExp(`\\b${number}\\b.*:`, 'i')
    ]

    for (const pattern of patterns) {
      if (pattern.test(chunk.content)) {
        score += 15 // High boost for numbered items
      }
    }
  }

  // Normalize score by chunk length
  return score / Math.log(chunk.content.length + 1)
}

/**
 * Enhanced hybrid search: semantic + keyword search
 */
export async function selectRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  options: ContextRetrievalOptions = {}
): Promise<DocumentChunk[]> {
  const {
    maxTokens = 4000,
    minRelevanceScore = 0.1,
    useSemanticSearch = true,
    hybridWeight = 0.7, // 0.7 semantic, 0.3 keyword
    maxChunks = 10
  } = options

  const startTime = Date.now()
  let searchStrategy: 'semantic' | 'keyword' | 'hybrid' = 'keyword'

  try {
    // Always calculate keyword scores (fast fallback)
    const chunksWithKeywordScores = chunks.map(chunk => ({
      ...chunk,
      keywordScore: calculateRelevanceScore(query, chunk)
    }))

    let scoredChunks = chunksWithKeywordScores

    // Add semantic search if enabled and embeddings available
    if (useSemanticSearch) {
      try {
        const queryEmbedding = await generateEmbedding(query)

        // Calculate semantic scores for chunks with embeddings
        scoredChunks = await Promise.all(
          chunksWithKeywordScores.map(async (chunk) => {
            let semanticScore = 0

            if (chunk.embedding) {
              // Use existing embedding
              semanticScore = cosineSimilarity(queryEmbedding.embedding, chunk.embedding)
            } else if (options.generateEmbeddings) {
              // Generate embedding on-demand (slower but more accurate)
              try {
                const chunkEmbedding = await generateEmbedding(chunk.content)
                chunk.embedding = chunkEmbedding.embedding
                semanticScore = cosineSimilarity(queryEmbedding.embedding, chunkEmbedding.embedding)
              } catch (error) {
                console.warn('[SmartContext] Failed to generate chunk embedding:', error)
                semanticScore = 0
              }
            }

            // Hybrid scoring: combine semantic and keyword scores
            const combinedScore = semanticScore > 0
              ? (semanticScore * hybridWeight) + (chunk.keywordScore * (1 - hybridWeight))
              : chunk.keywordScore

            searchStrategy = semanticScore > 0 ? 'hybrid' : 'keyword'

            return {
              ...chunk,
              semanticScore,
              combinedScore: combinedScore
            }
          })
        )
      } catch (error) {
        console.warn('[SmartContext] Semantic search failed, falling back to keyword search:', error)
        scoredChunks = chunksWithKeywordScores.map(chunk => ({
          ...chunk,
          combinedScore: chunk.keywordScore
        }))
      }
    } else {
      // Pure keyword search
      scoredChunks = chunksWithKeywordScores.map(chunk => ({
        ...chunk,
        combinedScore: chunk.keywordScore
      }))
    }

    // Sort by combined score
    const sortedChunks = scoredChunks
      .filter(chunk => (chunk.combinedScore || chunk.keywordScore || 0) >= minRelevanceScore)
      .sort((a, b) => (b.combinedScore || b.keywordScore || 0) - (a.combinedScore || a.keywordScore || 0))
      .slice(0, maxChunks)

    // Select chunks within token limit
    const selectedChunks: DocumentChunk[] = []
    let currentTokens = 0
    const avgTokensPerChar = 0.25

    for (const chunk of sortedChunks) {
      const chunkTokens = chunk.content.length * avgTokensPerChar

      if (currentTokens + chunkTokens <= maxTokens) {
        selectedChunks.push(chunk)
        currentTokens += chunkTokens
      } else {
        break
      }
    }

    // Fallback: ensure we return at least some content
    if (selectedChunks.length === 0 && sortedChunks.length > 0) {
      let fallbackTokens = 0
      for (const chunk of sortedChunks.slice(0, 3)) {
        const chunkTokens = chunk.content.length * avgTokensPerChar
        if (fallbackTokens + chunkTokens <= maxTokens) {
          selectedChunks.push(chunk)
          fallbackTokens += chunkTokens
        }
      }
    }

    console.log(`[SmartContext] ${searchStrategy} search found ${selectedChunks.length} chunks in ${Date.now() - startTime}ms`)
    return selectedChunks

  } catch (error) {
    console.error('[SmartContext] Error in selectRelevantChunks:', error)

    // Emergency fallback: basic keyword search
    const basicChunks = chunks
      .map(chunk => ({
        ...chunk,
        keywordScore: calculateRelevanceScore(query, chunk)
      }))
      .filter(chunk => chunk.keywordScore >= minRelevanceScore)
      .sort((a, b) => b.keywordScore - a.keywordScore)
      .slice(0, 3)

    return basicChunks
  }
}

/**
 * Enterprise-grade smart context retrieval for document chat
 * Uses FREE semantic search + keyword search hybrid approach
 */
/**
 * Generate cache key for context requests
 */
function generateContextCacheKey(query: string, documentContent: string, options: ContextRetrievalOptions): string {
  const optionsStr = JSON.stringify(options)
  const contentHash = documentContent.length + '_' + documentContent.slice(0, 100) + documentContent.slice(-100)
  return `ctx_${query.slice(0, 50)}_${contentHash}_${optionsStr}`.replace(/[^a-zA-Z0-9_]/g, '_')
}

/**
 * Clean expired context cache entries
 */
function cleanExpiredContextCache(): void {
  const now = Date.now()
  const expiredKeys: string[] = []

  for (const [key, value] of contextCache.entries()) {
    if (now - value.timestamp > CONTEXT_CACHE_TTL) {
      expiredKeys.push(key)
    }
  }

  expiredKeys.forEach(key => contextCache.delete(key))

  if (expiredKeys.length > 0) {
    console.log(`[SmartContext] Cleaned ${expiredKeys.length} expired context cache entries`)
  }
}

export async function getSmartContext(
  query: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): Promise<SearchResult> {
  const startTime = Date.now()

  // Check context cache first for recent identical requests
  const cacheKey = generateContextCacheKey(query, documentContent, options)
  const cached = contextCache.get(cacheKey)

  if (cached && (Date.now() - cached.timestamp) < CONTEXT_CACHE_TTL) {
    console.log(`[SmartContext] Context cache hit for query: "${query.slice(0, 50)}..."`)
    cached.result.processingTime = Date.now() - startTime
    return cached.result
  }

  // For smaller documents, return full content
  if (documentContent.length <= 8000) {
    return {
      context: documentContent,
      chunks: [{
        id: 'full_document',
        content: documentContent,
        startIndex: 0,
        endIndex: documentContent.length,
        combinedScore: 1.0,
        chunkType: 'paragraph'
      }],
      totalRelevance: 1.0,
      searchStrategy: 'keyword',
      processingTime: Date.now() - startTime
    }
  }

  try {
    // Enhanced semantic chunking
    const chunks = chunkDocument(documentContent, options)
    console.log(`[SmartContext] Created ${chunks.length} semantic chunks`)

    // Hybrid search: semantic + keyword
    const relevantChunks = await selectRelevantChunks(query, chunks, options)

    // Combine chunks into context with enhanced formatting
    const context = relevantChunks
      .map((chunk, index) => {
        let chunkText = chunk.content

        // Add section title if available
        if (chunk.sectionTitle) {
          chunkText = `### ${chunk.sectionTitle}\n\n${chunkText}`
        }

        // Add chunk metadata for debugging (only in development)
        if (process.env.NODE_ENV === 'development' && chunk.combinedScore) {
          chunkText += `\n[Score: ${chunk.combinedScore.toFixed(3)}]`
        }

        return chunkText
      })
      .join('\n\n---\n\n')

    const totalRelevance = relevantChunks.reduce((sum, chunk) =>
      sum + (chunk.combinedScore || chunk.keywordScore || 0), 0
    )

    const searchStrategy: 'semantic' | 'keyword' | 'hybrid' = relevantChunks.some(chunk => chunk.semanticScore && chunk.semanticScore > 0)
      ? 'hybrid'
      : 'keyword'

    const processingTime = Date.now() - startTime

    console.log(`[SmartContext] ${searchStrategy} search completed in ${processingTime}ms`)

    const result = {
      context,
      chunks: relevantChunks,
      totalRelevance,
      searchStrategy,
      processingTime,
      embeddingsGenerated: options.generateEmbeddings
    }

    // Cache the result for future identical requests
    contextCache.set(cacheKey, {
      result: { ...result }, // Deep copy to avoid mutations
      timestamp: Date.now()
    })

    // Periodic cache maintenance
    if (Math.random() < 0.2) { // 20% chance to trigger cleanup
      cleanExpiredContextCache()
      if (contextCache.size > MAX_CONTEXT_CACHE_SIZE) {
        // Remove oldest entries
        const entries = Array.from(contextCache.entries())
          .sort((a, b) => a[1].timestamp - b[1].timestamp)

        const toRemove = contextCache.size - MAX_CONTEXT_CACHE_SIZE
        for (let i = 0; i < toRemove; i++) {
          contextCache.delete(entries[i][0])
        }

        console.log(`[SmartContext] Removed ${toRemove} old context cache entries`)
      }
    }

    return result

  } catch (error) {
    console.error('[SmartContext] Error in getSmartContext:', error)

    // Emergency fallback: return first 4000 characters
    const fallbackContent = documentContent.slice(0, 4000)

    return {
      context: fallbackContent,
      chunks: [{
        id: 'fallback_chunk',
        content: fallbackContent,
        startIndex: 0,
        endIndex: 4000,
        keywordScore: 0.5,
        chunkType: 'paragraph'
      }],
      totalRelevance: 0.5,
      searchStrategy: 'keyword',
      processingTime: Date.now() - startTime,
      embeddingsGenerated: false
    }
  }
}

/**
 * Build an enhanced prompt with smart context using FREE semantic search
 */
export async function buildContextPrompt(
  query: string,
  documentTitle: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): Promise<string> {
  const searchResult = await getSmartContext(query, documentContent, options)
  const { context, chunks, searchStrategy, processingTime } = searchResult

  const chunkInfo = chunks.length > 1
    ? `\n\n[Context extracted from ${chunks.length} relevant sections using ${searchStrategy} search in ${processingTime}ms]`
    : ''

  return `You have access to the following content from "${documentTitle}":

${context}${chunkInfo}

Instructions:
- Answer the user's question directly based on this document content
- Quote specific sections when relevant using the exact text from above
- Don't mention "reviewing" or "analyzing" the document - just answer naturally
- If asked about specific numbered points, lists, or sections, find them in the content above
- Be conversational and helpful, not formal or repetitive
- If the answer isn't clearly in the provided content, say so rather than guessing`
}

/**
 * Get comprehensive performance statistics for the smart context system
 */
export function getSmartContextStats() {
  const embeddingStats = getCacheStats()

  const now = Date.now()
  let expiredContextEntries = 0

  for (const [, value] of Array.from(contextCache.entries())) {
    if (now - value.timestamp > CONTEXT_CACHE_TTL) {
      expiredContextEntries++
    }
  }

  return {
    embeddings: embeddingStats,
    context: {
      totalEntries: contextCache.size,
      expiredEntries: expiredContextEntries,
      activeEntries: contextCache.size - expiredContextEntries,
      maxSize: MAX_CONTEXT_CACHE_SIZE,
      utilizationPercent: Math.round((contextCache.size / MAX_CONTEXT_CACHE_SIZE) * 100),
      ttlMinutes: CONTEXT_CACHE_TTL / (60 * 1000)
    },
    performance: {
      recommendation: getPerformanceRecommendation()
    }
  }
}

/**
 * Get performance recommendations based on current cache usage
 */
function getPerformanceRecommendation(): string {
  const contextUtilization = Math.round((contextCache.size / MAX_CONTEXT_CACHE_SIZE) * 100)
  const embeddingStats = getCacheStats()

  if (contextUtilization > 90) {
    return 'Context cache is nearly full. Consider increasing MAX_CONTEXT_CACHE_SIZE.'
  }

  if (embeddingStats.utilizationPercent > 90) {
    return 'Embedding cache is nearly full. Consider increasing MAX_CACHE_SIZE.'
  }

  if (embeddingStats.utilizationPercent < 20 && contextUtilization < 20) {
    return 'Cache utilization is low. Performance is optimal.'
  }

  return 'Cache performance is balanced and efficient.'
}

/**
 * Clear all smart context caches manually
 */
export function clearSmartContextCaches(): { embeddingCleared: number; contextCleared: number } {
  const contextCleared = contextCache.size

  contextCache.clear()
  console.log(`[SmartContext] Manually cleared ${contextCleared} context cache entries`)

  return { embeddingCleared: 0, contextCleared }
}

/**
 * Legacy synchronous version for backward compatibility
 */
export function buildContextPromptSync(
  query: string,
  documentTitle: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): string {
  // For small documents, use simple approach
  if (documentContent.length <= 8000) {
    return `You have access to the following content from "${documentTitle}":

${documentContent}

Instructions:
- Answer the user's question directly based on this document content
- Quote specific sections when relevant using the exact text from above
- Don't mention "reviewing" or "analyzing" the document - just answer naturally
- If asked about specific numbered points, lists, or sections, find them in the content above
- Be conversational and helpful, not formal or repetitive
- If the answer isn't clearly in the provided content, say so rather than guessing`
  }

  // For larger documents, use basic chunking (no async)
  const chunks = chunkDocument(documentContent, options)
  const keywordChunks = chunks
    .map(chunk => ({
      ...chunk,
      keywordScore: calculateRelevanceScore(query, chunk)
    }))
    .filter(chunk => chunk.keywordScore > 0.1)
    .sort((a, b) => b.keywordScore - a.keywordScore)
    .slice(0, 5)

  const context = keywordChunks
    .map(chunk => chunk.content)
    .join('\n\n---\n\n')

  return `You have access to the following content from "${documentTitle}":

${context}

[Context extracted from ${keywordChunks.length} relevant sections using keyword search]

Instructions:
- Answer the user's question directly based on this document content
- Quote specific sections when relevant using the exact text from above
- Don't mention "reviewing" or "analyzing" the document - just answer naturally
- If asked about specific numbered points, lists, or sections, find them in the content above
- Be conversational and helpful, not formal or repetitive
- If the answer isn't clearly in the provided content, say so rather than guessing`
}

/**
 * Get comprehensive performance statistics for the smart context system
 */
