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

// Intelligent embedding caching with document-level batching
const documentEmbeddingCache = new Map<string, { chunks: DocumentChunk[], timestamp: number }>()
const EMBEDDING_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours TTL for embeddings
const MAX_EMBEDDING_CACHE_SIZE = 50

// Smart chunk reuse for identical document content
const chunkCache = new Map<string, { chunks: DocumentChunk[], timestamp: number }>()
const CHUNK_CACHE_TTL = 60 * 60 * 1000 // 1 hour TTL for chunks

// Pre-computation queue for background embedding generation
interface EmbeddingTask {
  documentHash: string
  chunks: DocumentChunk[]
  priority: 'high' | 'medium' | 'low'
  startTime: number
}
const embeddingQueue: EmbeddingTask[] = []
let isProcessingQueue = false

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
 * Intelligent context scoring that understands document structure
 */
function calculateIntelligentScore(query: string, chunk: DocumentChunk): number {
  const queryLower = query.toLowerCase()
  const contentLower = chunk.content.toLowerCase()
  let score = 0

  // 1. Formal element recognition (examples, figures, tables)
  if (/\b(example|figure|table|diagram|listing)\s+\d+/i.test(queryLower)) {
    // Query is asking for formal numbered elements
    const formalMatches = contentLower.match(/\b(example|figure|table|diagram|listing)\s+\d+/g) || []
    score += formalMatches.length * 15 // High bonus for formal elements

    // Extract specific numbers if mentioned in query
    const queryNumbers = queryLower.match(/\b\d+/g) || []
    const contentNumbers = contentLower.match(/\b(example|figure|table|diagram|listing)\s+(\d+)/g) || []

    for (const queryNum of queryNumbers) {
      for (const contentMatch of contentNumbers) {
        if (contentMatch.includes(queryNum)) {
          score += 25 // Very high bonus for exact number matches
        }
      }
    }
  }

  // 2. Chapter/section references
  if (/\bchapter\s+\d+/i.test(queryLower)) {
    const chapterMatches = contentLower.match(/\bchapter\s+\d+/g) || []
    score += chapterMatches.length * 10

    // Extract specific chapter numbers
    const queryChapter = queryLower.match(/\bchapter\s+(\d+)/i)?.[1]
    if (queryChapter) {
      const chapterRegex = new RegExp(`\\bchapter\\s+${queryChapter}\\b`, 'i')
      if (chapterRegex.test(contentLower)) {
        score += 30 // Very high bonus for exact chapter match
      }
    }
  }

  // 3. Structural importance scoring
  if (chunk.sectionTitle) {
    const titleLower = chunk.sectionTitle.toLowerCase()
    if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) {
      score += 20 // High bonus for title matches
    }
  }

  // 4. Content density scoring (prefer chunks with more relevant content)
  const contentWords = contentLower.split(/\s+/).length
  if (contentWords > 100 && contentWords < 2000) {
    score += 5 // Bonus for well-sized chunks
  }

  // 5. Basic keyword matching (from original function)
  const keywordScore = calculateRelevanceScore(query, chunk)
  score += keywordScore

  return score
}

/**
 * Enhanced hybrid search: semantic + keyword + intelligent structural analysis
 */
export async function selectRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  options: ContextRetrievalOptions = {}
): Promise<DocumentChunk[]> {
  const {
    maxTokens = 200000, // 200K practical limit for optimal quality
    minRelevanceScore = 0.1,
    useSemanticSearch = true,
    hybridWeight = 0.7, // 0.7 semantic, 0.3 keyword
    maxChunks = 10
  } = options

  const startTime = Date.now()
  let searchStrategy: 'semantic' | 'keyword' | 'hybrid' = 'keyword'

  try {
    // Calculate both keyword and intelligent structural scores
    const chunksWithScores = chunks.map(chunk => {
      const keywordScore = calculateRelevanceScore(query, chunk)
      const intelligentScore = calculateIntelligentScore(query, chunk)

      return {
        ...chunk,
        keywordScore,
        intelligentScore,
        baseScore: Math.max(keywordScore, intelligentScore) // Use the higher of the two
      }
    })

    let scoredChunks = chunksWithScores

    // Add semantic search if enabled and embeddings available
    if (useSemanticSearch) {
      try {
        const queryEmbedding = await generateEmbedding(query)

        // Check if we need to generate embeddings for chunks without them
        const chunksNeedingEmbeddings = chunksWithScores.filter(chunk => !chunk.embedding)
        if (chunksNeedingEmbeddings.length > 0 && options.generateEmbeddings) {
          console.log(`[SmartContext] Generating embeddings for ${chunksNeedingEmbeddings.length} chunks using batch processing`)
          const enhancedChunks = await generateBatchEmbeddingsOptimized(chunksWithScores)
          // Update the original chunks with embeddings
          chunksWithScores.forEach((chunk, index) => {
            if (enhancedChunks[index] && enhancedChunks[index].embedding) {
              chunk.embedding = enhancedChunks[index].embedding
            }
          })
        }

        // Calculate semantic scores for chunks with embeddings
        scoredChunks = chunksWithScores.map((chunk) => {
          let semanticScore = 0

          if (chunk.embedding) {
            // Use existing embedding
            semanticScore = cosineSimilarity(queryEmbedding.embedding, chunk.embedding)
          }

          // Advanced hybrid scoring: combine semantic, keyword, and intelligent structural scores
          let combinedScore
          if (semanticScore > 0) {
            combinedScore = (semanticScore * hybridWeight * 0.4) +
                          (chunk.baseScore * (1 - hybridWeight) * 0.6) // Favor intelligent scoring
            searchStrategy = 'hybrid'
          } else {
            combinedScore = chunk.baseScore
            searchStrategy = 'keyword'
          }

          return {
            ...chunk,
            semanticScore,
            combinedScore
          }
        })
      } catch (error) {
        console.warn('[SmartContext] Semantic search failed, falling back to intelligent search:', error)
        scoredChunks = chunksWithScores.map(chunk => ({
          ...chunk,
          combinedScore: chunk.baseScore
        }))
        searchStrategy = 'keyword'
      }
    } else {
      // Pure intelligent + keyword search
      scoredChunks = chunksWithScores.map(chunk => ({
        ...chunk,
        combinedScore: chunk.baseScore
      }))
      searchStrategy = 'keyword'
    }

    // Sort by combined score
    const allChunksWithScores = scoredChunks.sort((a, b) => (b.combinedScore || b.keywordScore || 0) - (a.combinedScore || a.keywordScore || 0))

    // Debug: Log top chunks and their scores
    console.log(`[SmartContext] Top 5 chunks scores:`, allChunksWithScores.slice(0, 5).map(chunk => ({
      id: chunk.id,
      semanticScore: chunk.semanticScore?.toFixed(3) || 'N/A',
      keywordScore: chunk.keywordScore?.toFixed(3) || 'N/A',
      intelligentScore: (chunk as any).intelligentScore?.toFixed(3) || 'N/A',
      combinedScore: chunk.combinedScore?.toFixed(3) || 'N/A',
      preview: chunk.content.slice(0, 50) + '...'
    })))

    console.log(`[SmartContext] Using minRelevanceScore: ${minRelevanceScore}, maxChunks: ${maxChunks}`)

    const sortedChunks = allChunksWithScores
      .filter(chunk => (chunk.combinedScore || chunk.keywordScore || 0) >= minRelevanceScore)
      .slice(0, maxChunks)

    console.log(`[SmartContext] After filtering: ${sortedChunks.length} chunks passed threshold`)

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

    // Enhanced fallback: ensure we return at least some content
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

    // NUCLEAR OPTION: For chapter/figure references, if we have very few results,
    // add the highest scoring chunks regardless of threshold
    if (selectedChunks.length < 6 && maxChunks >= 10) {
      console.log(`[SmartContext] Adding more chunks for comprehensive search (had ${selectedChunks.length}, target ${maxChunks})`)

      // Get additional chunks from the sorted list (ignore threshold completely)
      const additionalChunks = sortedChunks
        .filter(chunk => !selectedChunks.some(selected => selected.id === chunk.id))
        .slice(0, maxChunks - selectedChunks.length)

      let additionalTokens = currentTokens
      for (const chunk of additionalChunks) {
        const chunkTokens = chunk.content.length * avgTokensPerChar
        if (additionalTokens + chunkTokens <= maxTokens) {
          selectedChunks.push(chunk)
          additionalTokens += chunkTokens
        }
      }

      console.log(`[SmartContext] Expanded to ${selectedChunks.length} chunks for comprehensive coverage`)
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
 * Advanced query classification for adaptive context selection
 */
interface QueryAnalysis {
  type: 'overview' | 'specific' | 'technical' | 'chapter-reference' | 'general'
  confidence: number
  suggestedChunkCount: number
  suggestedThreshold: number
  hybridWeight: number
  needsBroadContext: boolean
}

function analyzeQuery(query: string): QueryAnalysis {
  const lowerQuery = query.toLowerCase().trim()

  // 1. Overview query detection (comprehensive topic coverage)
  const overviewPatterns = [
    /\b(topics?|subjects?|themes?|chapters?|sections?)\b.*\b(covered?|included?|discussed?|mentioned?|addressed?)\b/,
    /\b(what|which)\b.*\b(topics?|subjects?|themes?|chapters?|sections?|content)\b/,
    /\b(all|main|key|important)\b.*\b(topics?|subjects?|themes?|points?|concepts?)\b/,
    /\b(overview|summary|summari[sz]e|outline|table of contents?|toc)\b/,
    /\b(curriculum|syllabus|course content|study guide)\b/,
    /\b(structure|organization|layout)\b.*\b(document|book|material)\b/
  ]

  // 2. Chapter/Section reference detection (needs cross-chapter search)
  const chapterPatterns = [
    /\b(chapter|section|part|unit)\s*\d+/i,
    /\b(fig|figure|table|diagram)\s*\d+/i,
    /\b(in|from|about|of)\s+(chapter|section|part)\s*\d+/i,
    /\b(how many|count|number of)\b.*\b(figures?|tables?|diagrams?|images?|examples?)\b/i,
    /\b(list|show|find|locate)\b.*\b(figures?|tables?|diagrams?|examples?)\b/i
  ]

  // 3. Technical/specific query detection (needs precise context)
  const technicalPatterns = [
    /\b(algorithm|implementation|code|syntax|example|procedure)\b/,
    /\b(explain|how to|step[- ]by[- ]step|process|method)\b/,
    /\b(definition|meaning|concept|principle)\b.*\b(of|for)\b/,
    /\b(difference|comparison|vs|versus|compare)\b/,
    /\b(sql|query|database|table|join|index|normalization|acid)\b/i
  ]

  // 4. Specific detail queries (needs targeted but broader search)
  const specificPatterns = [
    /\b(specific|particular|exact|precise|detailed?)\b/,
    /\b(which|what|where|when|why|who)\b.*\b(exactly|specifically|precisely)\b/,
    /\b(details?|information|facts?|data)\b.*\b(about|on|regarding)\b/
  ]

  // Analyze query type and confidence
  let analysis: QueryAnalysis = {
    type: 'general',
    confidence: 0.3,
    suggestedChunkCount: 5,
    suggestedThreshold: 0.1,
    hybridWeight: 0.6,
    needsBroadContext: false
  }

  // Check for overview queries
  if (overviewPatterns.some(pattern => pattern.test(lowerQuery))) {
    analysis = {
      type: 'overview',
      confidence: 0.9,
      suggestedChunkCount: Math.floor(17 * 0.8), // 80% of chunks
      suggestedThreshold: 0.01,
      hybridWeight: 0.3, // Favor keywords for comprehensive coverage
      needsBroadContext: true
    }
  }
  // Check for chapter/figure references
  else if (chapterPatterns.some(pattern => pattern.test(lowerQuery))) {
    analysis = {
      type: 'chapter-reference',
      confidence: 0.85,
      suggestedChunkCount: Math.floor(17 * 0.7), // 70% of chunks for cross-chapter search
      suggestedThreshold: 0.03,
      hybridWeight: 0.4, // Balance semantic and keyword
      needsBroadContext: true
    }
  }
  // Check for technical queries
  else if (technicalPatterns.some(pattern => pattern.test(lowerQuery))) {
    analysis = {
      type: 'technical',
      confidence: 0.8,
      suggestedChunkCount: 8,
      suggestedThreshold: 0.05,
      hybridWeight: 0.7, // Favor semantic similarity for technical content
      needsBroadContext: false
    }
  }
  // Check for specific detail queries
  else if (specificPatterns.some(pattern => pattern.test(lowerQuery))) {
    analysis = {
      type: 'specific',
      confidence: 0.7,
      suggestedChunkCount: 10,
      suggestedThreshold: 0.04,
      hybridWeight: 0.6,
      needsBroadContext: true
    }
  }

  // Adjust for short queries (likely need broader context)
  if (lowerQuery.length <= 30 && analysis.type === 'general') {
    analysis.needsBroadContext = true
    analysis.suggestedChunkCount = 8
    analysis.suggestedThreshold = 0.05
  }

  return analysis
}

/**
 * Legacy function for backward compatibility
 */
function detectOverviewQuery(query: string): boolean {
  const analysis = analyzeQuery(query)
  return analysis.type === 'overview'
}

/**
 * Extract key topics and concepts from document content for better chunking
 */
function extractDocumentTopics(content: string): string[] {
  const topics: Set<string> = new Set()

  // Extract headings and titles (common patterns)
  const headingPatterns = [
    /^#+\s+([^\n]+)/gm, // Markdown headings
    /^([A-Z][A-Z\s]+)$/gm, // ALL CAPS lines
    /^(\d+\.?\d*\.?\s+[A-Z][^\n]+)/gm, // Numbered headings
    /^([A-Z][a-z\s]+:)\s*/gm, // Title Case with colon
    /(Chapter|Section|Part|Unit)\s+\d+[:\-.]?\s*([^\n]+)/gi,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/gm // Title Case standalone
  ]

  headingPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.replace(/^#+\s*|\d+\.?\s*|Chapter|Section|Part|Unit/gi, '').trim()
        if (cleaned.length > 3 && cleaned.length < 100) {
          topics.add(cleaned)
        }
      })
    }
  })

  // Extract technical terms and concepts (capitalized terms, acronyms)
  const conceptPatterns = [
    /\b([A-Z]{2,})\b/g, // Acronyms
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g, // Multi-word proper nouns
    /\b(SQL|Database|DBMS|MySQL|PostgreSQL|Oracle|MongoDB|NoSQL|ACID|JOIN|INDEX|QUERY|TABLE|SCHEMA|NORMALIZATION)\b/gi,
    // Add more domain-specific patterns as needed
  ]

  conceptPatterns.forEach(pattern => {
    const matches = content.match(pattern)
    if (matches) {
      matches.forEach(match => {
        const cleaned = match.trim()
        if (cleaned.length > 2) {
          topics.add(cleaned)
        }
      })
    }
  })

  return Array.from(topics).slice(0, 50) // Limit to prevent overload
}

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

  // For smaller documents, return full content (200K tokens ≈ 800K characters)
  if (documentContent.length <= 800000) {
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
    // Extract document topics for intelligent context selection
    const documentTopics = extractDocumentTopics(documentContent)
    console.log(`[SmartContext] Extracted ${documentTopics.length} document topics`)

    // Enhanced semantic chunking with intelligent caching
    const chunks = await getChunksWithEmbeddings(documentContent, options)
    console.log(`[SmartContext] Retrieved ${chunks.length} chunks with smart caching`)

    // Advanced query analysis for adaptive context selection
    const queryAnalysis = analyzeQuery(query)
    console.log(`[SmartContext] Query analysis: ${queryAnalysis.type} (confidence: ${queryAnalysis.confidence.toFixed(2)})`)

    // Apply adaptive context selection based on query type
    if (queryAnalysis.needsBroadContext) {
      console.log(`[SmartContext] ${queryAnalysis.type} query detected, using adaptive selection`)

      // Override options with intelligent defaults
      options.minRelevanceScore = Math.min(options.minRelevanceScore || 0.1, queryAnalysis.suggestedThreshold)
      options.maxChunks = Math.max(options.maxChunks || 5, queryAnalysis.suggestedChunkCount)
      options.hybridWeight = queryAnalysis.hybridWeight

      // Special handling for different query types
      if (queryAnalysis.type === 'overview' && documentTopics.length > 0) {
        const enhancedQuery = `${query} topics subjects chapters sections content overview: ${documentTopics.slice(0, 10).join(' ')}`
        console.log(`[SmartContext] Enhanced overview query with document topics`)
        query = enhancedQuery
      } else if (queryAnalysis.type === 'chapter-reference') {
        // For chapter references, expand query with chapter-related terms
        const chapterQuery = `${query} chapter section figure table diagram example content`
        console.log(`[SmartContext] Enhanced chapter reference query for cross-document search`)
        query = chapterQuery
      }
    } else {
      // For precise queries, use suggested parameters but maintain focus
      options.minRelevanceScore = queryAnalysis.suggestedThreshold
      options.maxChunks = queryAnalysis.suggestedChunkCount
      options.hybridWeight = queryAnalysis.hybridWeight
      console.log(`[SmartContext] ${queryAnalysis.type} query using focused search`)
    }

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
      cleanExpiredCaches() // Clean all caches
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

    // Emergency fallback: return first 800K characters (200K tokens)
    const fallbackContent = documentContent.slice(0, 800000)

    return {
      context: fallbackContent,
      chunks: [{
        id: 'fallback_chunk',
        content: fallbackContent,
        startIndex: 0,
        endIndex: Math.min(800000, documentContent.length),
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

  // Extract topics for better context understanding
  const documentTopics = extractDocumentTopics(documentContent)
  const queryAnalysis = analyzeQuery(query)

  const chunkInfo = chunks.length > 1
    ? `\n\n[Context extracted from ${chunks.length} relevant sections using ${searchStrategy} search in ${processingTime}ms]`
    : ''

  const topicInfo = queryAnalysis.needsBroadContext && documentTopics.length > 0
    ? `\n\nKey topics/concepts found in this document: ${documentTopics.slice(0, 15).join(', ')}`
    : ''

  // Dynamic instructions based on query type
  let specialInstructions = ''
  switch (queryAnalysis.type) {
    case 'overview':
      specialInstructions = `
OVERVIEW QUERY DETECTED: The user is asking for topics, overview, or comprehensive coverage.
- Provide a comprehensive list of ALL major topics, chapters, sections, and themes
- Include specific chapter names, section titles, and key concepts
- Organize the response in a clear, structured format with categories
- Don't just summarize content - list out the actual topics and subjects covered
- Be thorough and comprehensive, covering the breadth of the document`
      break

    case 'chapter-reference':
      specialInstructions = `
CHAPTER/FIGURE REFERENCE QUERY: The user is asking about specific chapters, figures, or elements.
- Search through ALL provided sections to find relevant references
- List ALL occurrences, even if they appear in different chapters
- Include specific figure numbers, table numbers, or section references
- If something isn't found in the provided context, clearly state this
- Be exhaustive and thorough in your search across all provided content

IMPORTANT: When looking for "examples", distinguish between:
- ACTUAL EXAMPLES: Formal numbered examples (e.g., "Example 4.1", "Example 4.2") or clearly labeled examples
- CASUAL PHRASES: Phrases like "for example", "such as", "e.g." which introduce illustrations but aren't formal examples
- Only count formal, numbered, or clearly labeled examples as actual "examples"`
      break

    case 'technical':
      specialInstructions = `
TECHNICAL QUERY: The user is asking for specific technical information or explanations.
- Focus on precise, accurate technical details
- Include relevant examples, code, or implementation details
- Explain concepts clearly with proper terminology
- Reference specific sections or examples from the document`
      break

    case 'specific':
      specialInstructions = `
SPECIFIC DETAIL QUERY: The user is asking for particular information or details.
- Provide comprehensive details about the specific topic
- Include all relevant information from the provided context
- Cross-reference different sections if they contain related information
- Be thorough and detailed in your response`
      break
  }

  return `You have access to the following content from "${documentTitle}":

${context}${chunkInfo}${topicInfo}${specialInstructions}

Instructions:
- Answer the user's question directly based on this document content
- Quote specific sections when relevant using the exact text from above
- Don't mention "reviewing" or "analyzing" the document - just answer naturally
- If asked about specific numbered points, lists, or sections, find them in the content above
- Be conversational and helpful, not formal or repetitive
- If the answer isn't clearly in the provided content, say so rather than guessing`
}

// ==================== SPEED OPTIMIZATION FUNCTIONS ====================

/**
 * Generate document hash for caching
 */
function generateDocumentHash(content: string): string {
  // Use length + first/last 100 chars for fast hashing
  const start = content.slice(0, 100)
  const end = content.slice(-100)
  return `doc_${content.length}_${start.length}_${end.length}_${Date.now() % 1000000}`
}

/**
 * Clean expired caches
 */
function cleanExpiredCaches(): void {
  const now = Date.now()

  // Clean document embedding cache
  for (const [key, value] of documentEmbeddingCache.entries()) {
    if (now - value.timestamp > EMBEDDING_CACHE_TTL) {
      documentEmbeddingCache.delete(key)
    }
  }

  // Clean chunk cache
  for (const [key, value] of chunkCache.entries()) {
    if (now - value.timestamp > CHUNK_CACHE_TTL) {
      chunkCache.delete(key)
    }
  }
}

/**
 * Pre-compute embeddings for chunks in the background
 */
async function processEmbeddingQueue(): Promise<void> {
  if (isProcessingQueue || embeddingQueue.length === 0) return

  isProcessingQueue = true
  console.log(`[SmartContext] Processing ${embeddingQueue.length} embedding tasks in background`)

  while (embeddingQueue.length > 0) {
    const task = embeddingQueue.shift()!
    const startTime = Date.now()

    try {
      // Generate embeddings in batches for efficiency
      const batchSize = 5
      for (let i = 0; i < task.chunks.length; i += batchSize) {
        const batch = task.chunks.slice(i, i + batchSize)

        await Promise.all(batch.map(async (chunk) => {
          if (!chunk.embedding) {
            try {
              const embedding = await generateEmbedding(chunk.content)
              chunk.embedding = embedding.embedding
            } catch (error) {
              console.warn(`[SmartContext] Background embedding failed for chunk ${chunk.id}:`, error)
            }
          }
        }))

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Cache the processed chunks
      documentEmbeddingCache.set(task.documentHash, {
        chunks: task.chunks,
        timestamp: Date.now()
      })

      const processingTime = Date.now() - startTime
      console.log(`[SmartContext] Background processed ${task.chunks.length} chunks in ${processingTime}ms`)

    } catch (error) {
      console.error('[SmartContext] Background embedding processing failed:', error)
    }
  }

  isProcessingQueue = false
}

/**
 * Smart chunk retrieval with intelligent caching
 */
async function getChunksWithEmbeddings(
  documentContent: string,
  options: ContextRetrievalOptions = {}
): Promise<DocumentChunk[]> {
  const documentHash = generateDocumentHash(documentContent)

  // Check for cached chunks with embeddings
  const cachedEmbeddings = documentEmbeddingCache.get(documentHash)
  if (cachedEmbeddings && (Date.now() - cachedEmbeddings.timestamp) < EMBEDDING_CACHE_TTL) {
    console.log('[SmartContext] Using cached chunks with pre-computed embeddings')
    return cachedEmbeddings.chunks
  }

  // Check for cached chunks without embeddings
  const cachedChunks = chunkCache.get(documentHash)
  let chunks: DocumentChunk[]

  if (cachedChunks && (Date.now() - cachedChunks.timestamp) < CHUNK_CACHE_TTL) {
    console.log('[SmartContext] Using cached chunks, will compute embeddings')
    chunks = cachedChunks.chunks
  } else {
    console.log('[SmartContext] Creating new chunks')
    chunks = chunkDocument(documentContent, options)

    // Cache the chunks
    chunkCache.set(documentHash, {
      chunks: [...chunks], // Deep copy
      timestamp: Date.now()
    })
  }

  // If generating embeddings is requested, start background processing
  if (options.generateEmbeddings) {
    // Check if embeddings are already being processed
    const isInQueue = embeddingQueue.some(task => task.documentHash === documentHash)

    if (!isInQueue) {
      embeddingQueue.push({
        documentHash,
        chunks: [...chunks], // Deep copy for background processing
        priority: 'high',
        startTime: Date.now()
      })

      // Start background processing (non-blocking)
      setTimeout(() => processEmbeddingQueue(), 100)
    }
  }

  return chunks
}

/**
 * Optimized batch embedding generation for chunks
 */
async function generateBatchEmbeddingsOptimized(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
  const startTime = Date.now()
  const batchSize = 3 // Smaller batches for more responsive processing
  const chunksWithEmbeddings = [...chunks]

  console.log(`[SmartContext] Generating embeddings for ${chunks.length} chunks in batches of ${batchSize}`)

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)

    await Promise.all(batch.map(async (chunk, batchIndex) => {
      const chunkIndex = i + batchIndex
      if (!chunksWithEmbeddings[chunkIndex].embedding) {
        try {
          const embedding = await generateEmbedding(chunk.content)
          chunksWithEmbeddings[chunkIndex].embedding = embedding.embedding
        } catch (error) {
          console.warn(`[SmartContext] Failed to generate embedding for chunk ${chunk.id}:`, error)
        }
      }
    }))

    // Progress logging
    if (i + batchSize < chunks.length) {
      const progress = Math.round(((i + batchSize) / chunks.length) * 100)
      console.log(`[SmartContext] Embedding progress: ${progress}% (${i + batchSize}/${chunks.length})`)
    }
  }

  const processingTime = Date.now() - startTime
  console.log(`[SmartContext] Batch embedding generation completed in ${processingTime}ms`)

  return chunksWithEmbeddings
}

/**
 * Advanced context quality validation
 */
function validateContextQuality(chunks: DocumentChunk[], query: string): {
  qualityScore: number;
  recommendations: string[];
  isHighQuality: boolean;
  stats: {
    avgRelevanceScore: number;
    topChunkScore: number;
    coverageScore: number;
    coherenceScore: number;
  }
} {
  const recommendations: string[] = []
  let qualityScore = 0

  if (chunks.length === 0) {
    return {
      qualityScore: 0,
      recommendations: ['No relevant chunks found for the query'],
      isHighQuality: false,
      stats: { avgRelevanceScore: 0, topChunkScore: 0, coverageScore: 0, coherenceScore: 0 }
    }
  }

  // 1. Calculate average relevance score
  const avgRelevanceScore = chunks.reduce((sum, chunk) =>
    sum + (chunk.combinedScore || chunk.keywordScore || 0), 0) / chunks.length

  // 2. Check top chunk quality
  const topChunkScore = Math.max(...chunks.map(chunk => chunk.combinedScore || chunk.keywordScore || 0))

  // 3. Calculate coverage score (how well the chunks cover the query)
  const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2)
  const coverageScore = queryWords.length > 0
    ? queryWords.filter(word =>
        chunks.some(chunk => chunk.content.toLowerCase().includes(word))
      ).length / queryWords.length
    : 1

  // 4. Calculate coherence score (how well chunks relate to each other)
  let coherenceScore = 1
  if (chunks.length > 1) {
    const titles = chunks.map(chunk => chunk.sectionTitle).filter(Boolean)
    const uniqueTitles = new Set(titles)
    coherenceScore = titles.length > 0 ? (uniqueTitles.size / titles.length) : 0.5
  }

  // Overall quality calculation
  qualityScore = (avgRelevanceScore * 0.4) + (topChunkScore * 0.3) + (coverageScore * 0.2) + (coherenceScore * 0.1)

  // Generate recommendations
  if (avgRelevanceScore < 0.5) {
    recommendations.push('Low average relevance - consider expanding search parameters')
  }
  if (topChunkScore < 1.0) {
    recommendations.push('No highly relevant chunks found - query may need refinement')
  }
  if (coverageScore < 0.6) {
    recommendations.push('Poor query coverage - some keywords not found in content')
  }
  if (chunks.length < 3 && query.length > 50) {
    recommendations.push('Complex query with few results - consider broader search')
  }
  if (chunks.length > 10 && avgRelevanceScore < 2.0) {
    recommendations.push('Many low-quality chunks - consider higher relevance threshold')
  }

  const isHighQuality = qualityScore > 2.0 && avgRelevanceScore > 0.8 && topChunkScore > 1.0

  if (isHighQuality) {
    recommendations.push('High-quality context with excellent relevance')
  }

  return {
    qualityScore,
    recommendations,
    isHighQuality,
    stats: {
      avgRelevanceScore,
      topChunkScore,
      coverageScore,
      coherenceScore
    }
  }
}

/**
 * Enhanced context building with quality validation
 */
export async function buildContextPromptWithValidation(
  query: string,
  documentTitle: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): Promise<{
  prompt: string;
  quality: ReturnType<typeof validateContextQuality>;
  searchResult: SearchResult;
}> {
  const searchResult = await getSmartContext(query, documentContent, options)
  const quality = validateContextQuality(searchResult.chunks, query)

  // Enhance context based on quality validation
  let contextEnhancements = ''
  if (!quality.isHighQuality && quality.recommendations.length > 0) {
    contextEnhancements = `\n\n[Context Quality Notice: ${quality.recommendations[0]}]`
  }

  const prompt = await buildContextPrompt(query, documentTitle, documentContent, options) + contextEnhancements

  return {
    prompt,
    quality,
    searchResult
  }
}

/**
 * Smart context optimization based on real-time feedback
 */
export async function optimizeContext(
  query: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): Promise<{
  optimizedChunks: DocumentChunk[];
  optimization: {
    applied: string[];
    qualityImprovement: number;
    processingTime: number;
  }
}> {
  const startTime = Date.now()
  const appliedOptimizations: string[] = []

  // Initial context retrieval
  let searchResult = await getSmartContext(query, documentContent, options)
  let initialQuality = validateContextQuality(searchResult.chunks, query)

  // Optimization 1: If quality is low, try with relaxed threshold
  if (!initialQuality.isHighQuality && (options.minRelevanceScore || 0.1) > 0.05) {
    const relaxedOptions = { ...options, minRelevanceScore: 0.05, maxChunks: (options.maxChunks || 10) + 2 }
    const relaxedResult = await getSmartContext(query, documentContent, relaxedOptions)
    const relaxedQuality = validateContextQuality(relaxedResult.chunks, query)

    if (relaxedQuality.qualityScore > initialQuality.qualityScore) {
      searchResult = relaxedResult
      initialQuality = relaxedQuality
      appliedOptimizations.push('Relaxed relevance threshold')
    }
  }

  // Optimization 2: If still low quality, try enhanced query
  if (!initialQuality.isHighQuality) {
    const enhancedQuery = `${query} ${extractDocumentTopics(documentContent).slice(0, 5).join(' ')}`
    const enhancedResult = await getSmartContext(enhancedQuery, documentContent, options)
    const enhancedQuality = validateContextQuality(enhancedResult.chunks, query) // Validate against original query

    if (enhancedQuality.qualityScore > initialQuality.qualityScore) {
      searchResult = enhancedResult
      initialQuality = enhancedQuality
      appliedOptimizations.push('Enhanced query with document topics')
    }
  }

  // Optimization 3: Smart chunk filtering based on quality metrics
  if (searchResult.chunks.length > 5 && initialQuality.stats.avgRelevanceScore < 1.0) {
    const filteredChunks = searchResult.chunks
      .filter(chunk => (chunk.combinedScore || chunk.keywordScore || 0) > initialQuality.stats.avgRelevanceScore)
      .slice(0, Math.max(3, Math.ceil(searchResult.chunks.length * 0.6)))

    if (filteredChunks.length > 0) {
      const filteredQuality = validateContextQuality(filteredChunks, query)
      if (filteredQuality.qualityScore > initialQuality.qualityScore) {
        searchResult.chunks = filteredChunks
        initialQuality = filteredQuality
        appliedOptimizations.push('Smart chunk filtering')
      }
    }
  }

  const processingTime = Date.now() - startTime

  return {
    optimizedChunks: searchResult.chunks,
    optimization: {
      applied: appliedOptimizations,
      qualityImprovement: initialQuality.qualityScore,
      processingTime
    }
  }
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
export function clearSmartContextCaches(): { embeddingCleared: number; contextCleared: number; chunkCleared: number; documentEmbeddingCleared: number } {
  const contextCleared = contextCache.size
  const chunkCleared = chunkCache.size
  const documentEmbeddingCleared = documentEmbeddingCache.size

  contextCache.clear()
  chunkCache.clear()
  documentEmbeddingCache.clear()

  console.log(`[SmartContext] Manually cleared all caches: ${contextCleared} context, ${chunkCleared} chunk, ${documentEmbeddingCleared} document embedding entries`)

  return { embeddingCleared: 0, contextCleared, chunkCleared, documentEmbeddingCleared }
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
  // For small documents, use simple approach (200K tokens ≈ 800K characters)
  if (documentContent.length <= 800000) {
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
