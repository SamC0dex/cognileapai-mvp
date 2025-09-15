/**
 * PDF Processing System for Document Chat
 * Handles PDF parsing, intelligent chunking, and embedding generation
 * Optimized for performance like NotebookLM
 */

import { openai } from '@ai-sdk/openai'
import { embedMany } from 'ai'
import { createClient } from '@supabase/supabase-js'

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const embeddingModel = openai.textEmbedding('text-embedding-3-small')

export interface PDFChunk {
  id?: string
  documentId: string
  chunkIndex: number
  content: string
  pageStart: number
  pageEnd: number
  sectionTitle?: string
  embedding?: number[]
  tokenCount: number
}

export interface ProcessingProgress {
  phase: 'parsing' | 'chunking' | 'embedding' | 'saving' | 'completed' | 'error'
  progress: number // 0-100
  message: string
  chunksProcessed?: number
  totalChunks?: number
}

/**
 * Intelligent PDF text extraction using PDF.js
 * Preserves document structure and page information
 */
export async function extractPDFText(pdfBuffer: Buffer): Promise<{
  text: string
  pageTexts: Array<{ pageNumber: number; text: string }>
  metadata: { pageCount: number; title?: string }
}> {
  // Dynamic import to avoid SSR issues
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.js')

  // Set up worker
  if (typeof window === 'undefined') {
    // Server-side: use node canvas factory
    const pdfjsWorker = await import('pdfjs-dist/legacy/build/pdf.worker.entry.js')
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker.default
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer })
  const pdf = await loadingTask.promise

  const pageTexts: Array<{ pageNumber: number; text: string }> = []
  let fullText = ''

  // Extract text from each page
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    pageTexts.push({ pageNumber: pageNum, text: pageText })
    fullText += pageText + '\n'
  }

  // Extract metadata
  const metadata = await pdf.getMetadata()

  return {
    text: fullText.trim(),
    pageTexts,
    metadata: {
      pageCount: pdf.numPages,
      title: metadata.info?.Title
    }
  }
}

/**
 * Smart text chunking strategy
 * Optimized for semantic coherence and context preservation
 */
export function createSmartChunks(
  text: string,
  pageTexts: Array<{ pageNumber: number; text: string }>,
  options: {
    maxTokens?: number
    overlapTokens?: number
    preserveSentences?: boolean
  } = {}
): PDFChunk[] {
  const {
    maxTokens = 800,
    overlapTokens = 100,
    preserveSentences = true
  } = options

  // Simple token estimation (roughly 4 chars per token)
  const estimateTokens = (text: string) => Math.ceil(text.length / 4)

  const chunks: Omit<PDFChunk, 'documentId'>[] = []
  let currentChunk = ''
  let currentTokens = 0
  let chunkIndex = 0
  let chunkStartPage = 1
  let chunkEndPage = 1

  // Process text by sentences for better semantic boundaries
  const sentences = text.split(/(?<=[.!?])\s+/)

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence)

    // Find which page this sentence belongs to
    const sentencePage = findPageForText(sentence, pageTexts)

    // If adding this sentence would exceed max tokens, finalize current chunk
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        chunkIndex,
        content: currentChunk.trim(),
        pageStart: chunkStartPage,
        pageEnd: chunkEndPage,
        tokenCount: currentTokens
      })

      // Start new chunk with overlap
      const overlapText = preserveSentences
        ? getLastSentences(currentChunk, overlapTokens)
        : currentChunk.slice(-overlapTokens * 4)

      currentChunk = overlapText + ' ' + sentence
      currentTokens = estimateTokens(currentChunk)
      chunkStartPage = sentencePage
      chunkEndPage = sentencePage
      chunkIndex++
    } else {
      // Add sentence to current chunk
      currentChunk += (currentChunk ? ' ' : '') + sentence
      currentTokens += sentenceTokens

      if (chunkIndex === 0) chunkStartPage = sentencePage
      chunkEndPage = sentencePage
    }
  }

  // Add final chunk if there's remaining content
  if (currentChunk.trim()) {
    chunks.push({
      chunkIndex,
      content: currentChunk.trim(),
      pageStart: chunkStartPage,
      pageEnd: chunkEndPage,
      tokenCount: currentTokens
    })
  }

  return chunks as PDFChunk[]
}

/**
 * Generate embeddings for chunks using OpenAI
 * Optimized for batch processing
 */
export async function generateChunkEmbeddings(
  chunks: PDFChunk[],
  onProgress?: (progress: ProcessingProgress) => void
): Promise<PDFChunk[]> {
  const batchSize = 100 // Process in batches to avoid rate limits
  const chunksWithEmbeddings: PDFChunk[] = []

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    const batchContents = batch.map(chunk => chunk.content)

    try {
      onProgress?.({
        phase: 'embedding',
        progress: Math.round((i / chunks.length) * 100),
        message: `Generating embeddings for chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)}...`,
        chunksProcessed: i,
        totalChunks: chunks.length
      })

      const { embeddings } = await embedMany({
        model: embeddingModel,
        values: batchContents
      })

      // Combine chunks with their embeddings
      batch.forEach((chunk, index) => {
        chunksWithEmbeddings.push({
          ...chunk,
          embedding: embeddings[index]
        })
      })

      // Small delay to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error generating embeddings for batch:', error)
      throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return chunksWithEmbeddings
}

/**
 * Save processed chunks to database
 */
export async function saveChunksToDatabase(
  documentId: string,
  chunks: PDFChunk[],
  onProgress?: (progress: ProcessingProgress) => void
): Promise<void> {
  try {
    onProgress?.({
      phase: 'saving',
      progress: 0,
      message: 'Saving chunks to database...'
    })

    // Prepare chunks for database insertion
    const chunksForDb = chunks.map(chunk => ({
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      page_start: chunk.pageStart,
      page_end: chunk.pageEnd,
      section_title: chunk.sectionTitle,
      embedding: chunk.embedding,
      token_count: chunk.tokenCount
    }))

    // Insert chunks in batches
    const batchSize = 50
    for (let i = 0; i < chunksForDb.length; i += batchSize) {
      const batch = chunksForDb.slice(i, i + batchSize)

      const { error } = await supabase
        .from('pdf_chunks')
        .insert(batch)

      if (error) {
        throw error
      }

      onProgress?.({
        phase: 'saving',
        progress: Math.round(((i + batch.length) / chunksForDb.length) * 100),
        message: `Saved ${i + batch.length}/${chunksForDb.length} chunks...`
      })
    }

    // Update document status
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        processing_status: 'completed',
        chunk_count: chunks.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) {
      console.warn('Failed to update document status:', updateError)
    }

  } catch (error) {
    console.error('Error saving chunks to database:', error)

    // Update document with error status
    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    throw error
  }
}

/**
 * Main function to process a PDF document
 * Orchestrates the entire pipeline with progress tracking
 */
export async function processPDFDocument(
  documentId: string,
  pdfBuffer: Buffer,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<{ success: boolean; chunkCount: number; error?: string }> {
  try {
    // Phase 1: Parse PDF
    onProgress?.({
      phase: 'parsing',
      progress: 0,
      message: 'Extracting text from PDF...'
    })

    const { text, pageTexts } = await extractPDFText(pdfBuffer)

    // Phase 2: Create chunks
    onProgress?.({
      phase: 'chunking',
      progress: 25,
      message: 'Creating intelligent chunks...'
    })

    const chunks = createSmartChunks(text, pageTexts)

    // Phase 3: Generate embeddings
    onProgress?.({
      phase: 'embedding',
      progress: 50,
      message: 'Generating AI embeddings...'
    })

    const chunksWithEmbeddings = await generateChunkEmbeddings(chunks, onProgress)

    // Phase 4: Save to database
    await saveChunksToDatabase(documentId, chunksWithEmbeddings, onProgress)

    onProgress?.({
      phase: 'completed',
      progress: 100,
      message: `Successfully processed ${chunks.length} chunks!`
    })

    return { success: true, chunkCount: chunks.length }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    onProgress?.({
      phase: 'error',
      progress: 0,
      message: `Processing failed: ${errorMessage}`
    })

    return { success: false, chunkCount: 0, error: errorMessage }
  }
}

// Helper functions

function findPageForText(text: string, pageTexts: Array<{ pageNumber: number; text: string }>): number {
  for (const page of pageTexts) {
    if (page.text.includes(text.substring(0, 50))) {
      return page.pageNumber
    }
  }
  return 1 // Default to page 1 if not found
}

function getLastSentences(text: string, maxTokens: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/)
  let result = ''
  let tokens = 0

  for (let i = sentences.length - 1; i >= 0; i--) {
    const sentenceTokens = Math.ceil(sentences[i].length / 4)
    if (tokens + sentenceTokens > maxTokens) break

    result = sentences[i] + (result ? ' ' + result : '')
    tokens += sentenceTokens
  }

  return result
}