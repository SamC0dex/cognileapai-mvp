/**
 * Smart Context Management for PDF Documents
 * Provides intelligent chunking and retrieval for large documents
 */

export interface DocumentChunk {
  id: string
  content: string
  startIndex: number
  endIndex: number
  pageNumbers?: number[]
  score?: number
}

export interface ContextRetrievalOptions {
  maxTokens?: number
  chunkSize?: number
  overlap?: number
  minRelevanceScore?: number
}

/**
 * Split document content into manageable chunks with overlap
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
  const words = content.split(/\s+/)

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunkWords = words.slice(i, i + chunkSize)
    const chunkContent = chunkWords.join(' ')

    if (chunkContent.trim()) {
      chunks.push({
        id: `chunk_${chunks.length}`,
        content: chunkContent,
        startIndex: i,
        endIndex: Math.min(i + chunkSize, words.length)
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
 * Select the most relevant chunks for a given query
 */
export function selectRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  options: ContextRetrievalOptions = {}
): DocumentChunk[] {
  const {
    maxTokens = 4000,
    minRelevanceScore = 0.1
  } = options

  // Calculate relevance scores
  const scoredChunks = chunks.map(chunk => ({
    ...chunk,
    score: calculateRelevanceScore(query, chunk)
  }))

  // Sort by relevance score
  const sortedChunks = scoredChunks
    .filter(chunk => chunk.score! >= minRelevanceScore)
    .sort((a, b) => b.score! - a.score!)

  // Select chunks within token limit
  const selectedChunks: DocumentChunk[] = []
  let currentTokens = 0
  const avgTokensPerChar = 0.25 // Rough estimate

  for (const chunk of sortedChunks) {
    const chunkTokens = chunk.content.length * avgTokensPerChar

    if (currentTokens + chunkTokens <= maxTokens) {
      selectedChunks.push(chunk)
      currentTokens += chunkTokens
    } else {
      break
    }
  }

  // If no chunks meet the relevance threshold, return top chunks anyway
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

  return selectedChunks
}

/**
 * Smart context retrieval for document chat
 */
export function getSmartContext(
  query: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): {
  context: string
  chunks: DocumentChunk[]
  totalRelevance: number
} {
  // For smaller documents, return full content
  if (documentContent.length <= 8000) {
    return {
      context: documentContent,
      chunks: [{
        id: 'full_document',
        content: documentContent,
        startIndex: 0,
        endIndex: documentContent.length,
        score: 1.0
      }],
      totalRelevance: 1.0
    }
  }

  // Chunk the document
  const chunks = chunkDocument(documentContent, options)

  // Select relevant chunks
  const relevantChunks = selectRelevantChunks(query, chunks, options)

  // Combine chunks into context
  const context = relevantChunks
    .map(chunk => chunk.content)
    .join('\n\n---\n\n')

  const totalRelevance = relevantChunks.reduce((sum, chunk) => sum + (chunk.score || 0), 0)

  return {
    context,
    chunks: relevantChunks,
    totalRelevance
  }
}

/**
 * Build an enhanced prompt with smart context
 */
export function buildContextPrompt(
  query: string,
  documentTitle: string,
  documentContent: string,
  options: ContextRetrievalOptions = {}
): string {
  const { context, chunks, totalRelevance } = getSmartContext(query, documentContent, options)

  const chunkInfo = chunks.length > 1
    ? `\n\n[Context extracted from ${chunks.length} relevant sections of the document]`
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