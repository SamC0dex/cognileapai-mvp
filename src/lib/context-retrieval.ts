/**
 * Smart Context Retrieval System
 * NotebookLM-style intelligent context selection for document chat
 */

import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const embeddingModel = openai.textEmbedding('text-embedding-3-small')

export interface RetrievedChunk {
  id: string
  content: string
  pageStart: number
  pageEnd: number
  sectionTitle?: string
  similarity: number
  tokenCount: number
}

export interface DocumentContext {
  documentId: string
  documentTitle: string
  chunks: RetrievedChunk[]
  totalTokens: number
  strategy: 'auto' | 'minimal' | 'comprehensive'
}

export interface ContextRetrievalOptions {
  maxChunks?: number
  minSimilarity?: number
  maxTokens?: number
  includeContext?: boolean // Include surrounding chunks
  strategy?: 'auto' | 'minimal' | 'comprehensive'
}

/**
 * Find most relevant document chunks for a user query
 * Uses semantic similarity search with intelligent ranking
 */
export async function retrieveRelevantContext(
  query: string,
  documentId: string,
  options: ContextRetrievalOptions = {}
): Promise<DocumentContext> {
  const {
    maxChunks = 5,
    minSimilarity = 0.7,
    maxTokens = 4000,
    includeContext = true,
    strategy = 'auto'
  } = options

  try {
    // Step 1: Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, processing_status')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error('Document not found or not accessible')
    }

    if (document.processing_status !== 'completed') {
      throw new Error('Document is still being processed')
    }

    // Step 2: Generate query embedding
    const { embedding: queryEmbedding } = await embed({
      model: embeddingModel,
      value: query
    })

    // Step 3: Find similar chunks using vector similarity
    const { data: similarChunks, error: searchError } = await supabase.rpc(
      'find_similar_chunks',
      {
        query_embedding: queryEmbedding,
        document_id: documentId,
        similarity_threshold: minSimilarity,
        max_results: maxChunks * 2 // Get more results for filtering
      }
    )

    if (searchError) {
      console.error('Error searching for similar chunks:', searchError)
      throw new Error('Failed to search document content')
    }

    if (!similarChunks || similarChunks.length === 0) {
      return {
        documentId,
        documentTitle: document.title,
        chunks: [],
        totalTokens: 0,
        strategy
      }
    }

    // Step 4: Apply intelligent filtering and ranking
    let selectedChunks = await applySmartFiltering(
      similarChunks,
      query,
      strategy,
      maxChunks,
      maxTokens
    )

    // Step 5: Add contextual chunks if requested
    if (includeContext && selectedChunks.length > 0) {
      selectedChunks = await addContextualChunks(
        selectedChunks,
        documentId,
        maxTokens
      )
    }

    // Step 6: Final optimization
    const optimizedChunks = optimizeChunkSelection(selectedChunks, maxTokens)

    const totalTokens = optimizedChunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)

    return {
      documentId,
      documentTitle: document.title,
      chunks: optimizedChunks,
      totalTokens,
      strategy
    }

  } catch (error) {
    console.error('Error retrieving document context:', error)
    throw error
  }
}

/**
 * Apply intelligent filtering based on query type and strategy
 */
async function applySmartFiltering(
  chunks: any[],
  query: string,
  strategy: string,
  maxChunks: number,
  maxTokens: number
): Promise<RetrievedChunk[]> {
  // Convert database results to RetrievedChunk format
  let retrievedChunks: RetrievedChunk[] = chunks.map(chunk => ({
    id: chunk.id,
    content: chunk.content,
    pageStart: chunk.page_start,
    pageEnd: chunk.page_end,
    sectionTitle: chunk.section_title,
    similarity: chunk.similarity,
    tokenCount: chunk.token_count
  }))

  // Apply strategy-specific filtering
  switch (strategy) {
    case 'minimal':
      // Only the most relevant chunk
      retrievedChunks = retrievedChunks.slice(0, 1)
      break

    case 'comprehensive':
      // More chunks, lower similarity threshold
      retrievedChunks = retrievedChunks.filter(chunk => chunk.similarity > 0.6)
      break

    case 'auto':
    default:
      // Smart selection based on query characteristics
      const queryType = analyzeQueryType(query)
      retrievedChunks = filterByQueryType(retrievedChunks, queryType, maxChunks)
      break
  }

  // Ensure we don't exceed token limits
  let totalTokens = 0
  const filteredChunks: RetrievedChunk[] = []

  for (const chunk of retrievedChunks) {
    if (totalTokens + chunk.tokenCount <= maxTokens) {
      filteredChunks.push(chunk)
      totalTokens += chunk.tokenCount
    } else {
      break
    }
  }

  return filteredChunks
}

/**
 * Analyze query type to optimize chunk selection
 */
function analyzeQueryType(query: string): {
  type: 'specific' | 'broad' | 'summary' | 'comparison'
  needsMultipleContexts: boolean
} {
  const lowerQuery = query.toLowerCase()

  // Specific factual questions
  if (lowerQuery.match(/\b(what is|who is|when did|where is|how much|how many)\b/)) {
    return { type: 'specific', needsMultipleContexts: false }
  }

  // Broad conceptual questions
  if (lowerQuery.match(/\b(explain|describe|overview|understand|concept)\b/)) {
    return { type: 'broad', needsMultipleContexts: true }
  }

  // Summary requests
  if (lowerQuery.match(/\b(summary|summarize|main points|key takeaways)\b/)) {
    return { type: 'summary', needsMultipleContexts: true }
  }

  // Comparison questions
  if (lowerQuery.match(/\b(compare|contrast|difference|versus|vs)\b/)) {
    return { type: 'comparison', needsMultipleContexts: true }
  }

  return { type: 'broad', needsMultipleContexts: true }
}

/**
 * Filter chunks based on query type
 */
function filterByQueryType(
  chunks: RetrievedChunk[],
  queryType: { type: string; needsMultipleContexts: boolean },
  maxChunks: number
): RetrievedChunk[] {
  if (queryType.type === 'specific' && !queryType.needsMultipleContexts) {
    // For specific questions, prioritize the single best match
    return chunks.slice(0, 1)
  }

  if (queryType.type === 'summary' || queryType.type === 'comparison') {
    // For summaries and comparisons, get diverse chunks from different sections
    return getDiverseChunks(chunks, maxChunks)
  }

  // Default: return top chunks by similarity
  return chunks.slice(0, maxChunks)
}

/**
 * Get diverse chunks from different parts of the document
 */
function getDiverseChunks(chunks: RetrievedChunk[], maxChunks: number): RetrievedChunk[] {
  const diverseChunks: RetrievedChunk[] = []
  const usedPageRanges = new Set<string>()

  for (const chunk of chunks) {
    if (diverseChunks.length >= maxChunks) break

    const pageRange = `${chunk.pageStart}-${chunk.pageEnd}`

    // Avoid chunks from the same page range
    if (!usedPageRanges.has(pageRange)) {
      diverseChunks.push(chunk)
      usedPageRanges.add(pageRange)
    }
  }

  // If we don't have enough diverse chunks, fill with remaining high-similarity chunks
  const remainingSlots = maxChunks - diverseChunks.length
  if (remainingSlots > 0) {
    const additionalChunks = chunks
      .filter(chunk => !diverseChunks.some(dc => dc.id === chunk.id))
      .slice(0, remainingSlots)

    diverseChunks.push(...additionalChunks)
  }

  return diverseChunks
}

/**
 * Add contextual chunks (surrounding content) for better coherence
 */
async function addContextualChunks(
  selectedChunks: RetrievedChunk[],
  documentId: string,
  maxTokens: number
): Promise<RetrievedChunk[]> {
  const contextualChunkIds = new Set<string>()
  const allChunks = [...selectedChunks]

  // For each selected chunk, get adjacent chunks
  for (const chunk of selectedChunks) {
    const { data: adjacentChunks } = await supabase
      .from('pdf_chunks')
      .select('id, content, page_start, page_end, section_title, token_count, chunk_index')
      .eq('document_id', documentId)
      .gte('chunk_index', Math.max(0, getChunkIndex(chunk) - 1))
      .lte('chunk_index', getChunkIndex(chunk) + 1)
      .neq('id', chunk.id)

    if (adjacentChunks) {
      for (const adjChunk of adjacentChunks) {
        if (!contextualChunkIds.has(adjChunk.id)) {
          allChunks.push({
            id: adjChunk.id,
            content: adjChunk.content,
            pageStart: adjChunk.page_start,
            pageEnd: adjChunk.page_end,
            sectionTitle: adjChunk.section_title,
            similarity: 0.5, // Lower similarity for contextual chunks
            tokenCount: adjChunk.token_count
          })
          contextualChunkIds.add(adjChunk.id)
        }
      }
    }
  }

  // Sort by page order and remove duplicates
  const uniqueChunks = Array.from(
    new Map(allChunks.map(chunk => [chunk.id, chunk])).values()
  ).sort((a, b) => a.pageStart - b.pageStart)

  return optimizeChunkSelection(uniqueChunks, maxTokens)
}

/**
 * Optimize final chunk selection to fit within token limits
 */
function optimizeChunkSelection(chunks: RetrievedChunk[], maxTokens: number): RetrievedChunk[] {
  // Sort by similarity score (keep highest similarity chunks)
  chunks.sort((a, b) => b.similarity - a.similarity)

  const selectedChunks: RetrievedChunk[] = []
  let totalTokens = 0

  for (const chunk of chunks) {
    if (totalTokens + chunk.tokenCount <= maxTokens) {
      selectedChunks.push(chunk)
      totalTokens += chunk.tokenCount
    }
  }

  // Re-sort by page order for coherent presentation
  return selectedChunks.sort((a, b) => a.pageStart - b.pageStart)
}

/**
 * Build context-aware system prompt for document chat
 */
export function buildDocumentContextPrompt(context: DocumentContext, userQuery: string): string {
  if (context.chunks.length === 0) {
    return `You are CogniLeap AI. The user is asking about "${context.documentTitle}" but no relevant content was found. Politely explain that you cannot find information related to their query in the document and suggest they rephrase their question or check if they selected the correct document.`
  }

  const contextContent = context.chunks
    .map((chunk, index) => {
      const pageInfo = chunk.pageStart === chunk.pageEnd
        ? `Page ${chunk.pageStart}`
        : `Pages ${chunk.pageStart}-${chunk.pageEnd}`

      const sectionInfo = chunk.sectionTitle ? ` (${chunk.sectionTitle})` : ''

      return `--- Context ${index + 1} [${pageInfo}${sectionInfo}] ---\n${chunk.content}`
    })
    .join('\n\n')

  return `You are CogniLeap AI, an intelligent document assistant. You are answering questions about "${context.documentTitle}".

CONTEXT FROM DOCUMENT:
${contextContent}

INSTRUCTIONS:
1. Answer the user's question based ONLY on the provided context from the document
2. Include specific page references in your response (e.g., "According to page 15..." or "As mentioned on pages 12-14...")
3. If the context doesn't contain enough information to fully answer the question, say so explicitly
4. Maintain a helpful, educational tone
5. Use clear formatting with bullet points and headers when appropriate
6. DO NOT make up information not present in the provided context

USER QUESTION: ${userQuery}`
}

// Helper functions

function getChunkIndex(chunk: RetrievedChunk): number {
  // This would normally come from the database, using page as approximation
  return chunk.pageStart
}

/**
 * Create the SQL function for similarity search (to be run in Supabase)
 * This should be executed as a migration
 */
export const similaritySearchFunction = `
CREATE OR REPLACE FUNCTION find_similar_chunks(
  query_embedding vector(1536),
  document_id uuid,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  content text,
  page_start int,
  page_end int,
  section_title text,
  token_count int,
  similarity float
)
LANGUAGE sql
AS $$
  SELECT
    pc.id,
    pc.content,
    pc.page_start,
    pc.page_end,
    pc.section_title,
    pc.token_count,
    1 - (pc.embedding <=> query_embedding) as similarity
  FROM pdf_chunks pc
  WHERE pc.document_id = find_similar_chunks.document_id
    AND 1 - (pc.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT max_results;
$$;
`