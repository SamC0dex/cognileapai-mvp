import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { getStudyToolPrompt, generateStudyToolTitle, type StudyToolPromptType } from '@/lib/study-tools-prompts'
import { addRetryAttempt, classifyError } from '@/lib/retry-manager'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allow longer execution time for comprehensive generation
export const maxDuration = 60

/**
 * Multi-Model Fallback Strategy with Content Chunking
 * Implements sophisticated retry and fallback mechanisms for study tool generation
 */
interface FallbackResult {
  resultText: string
  modelUsed: string
  duration: number
  chunksUsed?: number
  fallbackReason?: string
}

interface ModelConfig {
  name: string
  maxInputTokens: number
  baseOutputTokens: number
  temperature: number
  topK: number
  maxRetries: number
}

interface RetryConfig {
  maxRetries: number
  delaysMs: number[]
}

// Error-type based retry configuration
const RETRY_STRATEGIES: Record<string, RetryConfig> = {
  'overloaded': { maxRetries: 3, delaysMs: [15000, 30000, 60000] },
  'rate_limit': { maxRetries: 2, delaysMs: [60000, 120000] },
  'internal_error': { maxRetries: 2, delaysMs: [30000, 45000] },
  'timeout': { maxRetries: 2, delaysMs: [15000, 30000] },
  'network': { maxRetries: 2, delaysMs: [15000, 30000] },
  'default': { maxRetries: 1, delaysMs: [30000] }
}

// All Gemini 2.5 models support up to 65,536 output tokens!
const GEMINI_MAX_OUTPUT_TOKENS = 65536

// Study tool specific token allocations (using full model capacity)
const TOOL_TOKEN_ALLOCATIONS: Record<string, number> = {
  'smart-notes': 32768,    // Long-form content needs more tokens
  'study-guide': 32768,    // Comprehensive guides need space
  'smart-summary': 16384,  // Summaries should be more concise
  'flashcards': 8192       // JSON arrays don't need as many tokens
}

const MODEL_HIERARCHY: ModelConfig[] = [
  {
    name: 'gemini-2.5-pro',
    maxInputTokens: 1000000,  // 1M context window
    baseOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    temperature: 0.7,
    topK: 40,
    maxRetries: 3
  },
  {
    name: 'gemini-2.5-flash',
    maxInputTokens: 1000000,  // 1M context window
    baseOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    temperature: 0.75,
    topK: 35,
    maxRetries: 3
  },
  {
    name: 'gemini-2.5-flash-lite',
    maxInputTokens: 1000000,  // 1M context window
    baseOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
    temperature: 0.8,
    topK: 30,
    maxRetries: 2 // Last resort gets fewer retries
  }
]

function getOptimalOutputTokens(toolType: string, modelName: string): number {
  // Use tool-specific allocation, but cap at model maximum
  const toolAllocation = TOOL_TOKEN_ALLOCATIONS[toolType] || 16384
  const modelConfig = MODEL_HIERARCHY.find(m => m.name === modelName)
  const modelMax = modelConfig?.baseOutputTokens || GEMINI_MAX_OUTPUT_TOKENS

  return Math.min(toolAllocation, modelMax)
}

function getRetryConfigForError(errorMessage: string): RetryConfig {
  const message = errorMessage.toLowerCase()

  if (message.includes('overloaded') || message.includes('busy') || message.includes('capacity')) {
    return RETRY_STRATEGIES.overloaded
  }
  if (message.includes('rate limit') || message.includes('quota') || message.includes('resource_exhausted')) {
    return RETRY_STRATEGIES.rate_limit
  }
  if (message.includes('internal') || message.includes('status 13') || message.includes('status 500')) {
    return RETRY_STRATEGIES.internal_error
  }
  if (message.includes('timeout') || message.includes('deadline') || message.includes('status 4')) {
    return RETRY_STRATEGIES.timeout
  }
  if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
    return RETRY_STRATEGIES.network
  }

  return RETRY_STRATEGIES.default
}

function getErrorType(errorMessage: string): string {
  const message = errorMessage.toLowerCase()

  if (message.includes('overloaded') || message.includes('busy')) return 'overloaded'
  if (message.includes('rate limit') || message.includes('quota')) return 'rate_limit'
  if (message.includes('internal') || message.includes('status 13')) return 'internal_error'
  if (message.includes('timeout') || message.includes('deadline')) return 'timeout'
  if (message.includes('network') || message.includes('connection')) return 'network'

  return 'unknown'
}

function isContentComplete(content: string, toolType: string): boolean {
  // Check if content appears to be properly completed
  const trimmed = content.trim()

  // Basic length check - very short content is likely truncated
  if (trimmed.length < 200) return false

  // Tool-specific completion indicators
  switch (toolType) {
    case 'flashcards':
      // For flashcards, check if JSON is properly closed
      try {
        JSON.parse(trimmed)
        return true
      } catch {
        return false
      }

    case 'smart-notes':
    case 'study-guide':
      // Long-form content should end with proper conclusion
      const lastParagraph = trimmed.split('\n\n').pop() || ''
      return lastParagraph.length > 50 && !lastParagraph.endsWith('...')

    case 'smart-summary':
      // Summaries should have proper endings
      return !trimmed.endsWith('...') && trimmed.length > 100

    default:
      return true
  }
}

async function generateWithFallback(
  systemPrompt: string,
  userPrompt: string,
  type: string,
  contentLength: number
): Promise<FallbackResult> {
  const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })

  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4)
  console.log(`[Fallback] Estimated input tokens: ${estimatedTokens}`)

  for (let modelIndex = 0; modelIndex < MODEL_HIERARCHY.length; modelIndex++) {
    const modelConfig = MODEL_HIERARCHY[modelIndex]
    const modelStartTime = Date.now()

    console.log(`[Fallback] Attempting generation with ${modelConfig.name} (tokens: ${estimatedTokens}/${modelConfig.maxInputTokens})`)

    // Check if content fits within model limits
    if (estimatedTokens > modelConfig.maxInputTokens) {
      console.log(`[Fallback] Content too large for ${modelConfig.name}, trying content chunking...`)

      // Try content chunking strategy
      const chunkResult = await generateWithChunking(
        client,
        modelConfig,
        systemPrompt,
        userPrompt,
        type
      )

      if (chunkResult) {
        return {
          ...chunkResult,
          modelUsed: `${modelConfig.name} (chunked)`,
          duration: Date.now() - modelStartTime,
          fallbackReason: `Content chunked for ${modelConfig.name} due to size`
        }
      }

      // If chunking fails, continue to next model
      console.log(`[Fallback] Chunking failed for ${modelConfig.name}, trying next model...`)
      continue
    }

    // Per-model retry loop
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= modelConfig.maxRetries; attempt++) {
      const attemptStartTime = Date.now()
      console.log(`[Fallback] ${modelConfig.name} attempt ${attempt}/${modelConfig.maxRetries}`)

      try {
        // Get optimal output tokens for this tool type and model
        const optimalOutputTokens = getOptimalOutputTokens(type, modelConfig.name)

        // Standard generation attempt
        const response = await client.models.generateContent({
          model: modelConfig.name,
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
          }],
          config: {
            temperature: modelConfig.temperature,
            maxOutputTokens: optimalOutputTokens,
            topK: modelConfig.topK,
          }
        })

        const resultText = response.text || ''

        // Check for truncation or insufficient content
        if (resultText.length < 50) {
          throw new Error(`Generated content too short (${resultText.length} chars) - likely generation failure`)
        }

        // Check for potential truncation (ends abruptly without proper conclusion)
        if (resultText.length > 100 && !isContentComplete(resultText, type)) {
          console.warn(`[Fallback] ${modelConfig.name} content appears truncated, may retry with higher token limit`)
        }

        console.log(`[Fallback] Success with ${modelConfig.name} (attempt ${attempt}, ${resultText.length} chars)`)
        return {
          resultText,
          modelUsed: `${modelConfig.name}${attempt > 1 ? ` (attempt ${attempt})` : ''}`,
          duration: Date.now() - modelStartTime
        }

      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error('Unknown error')
        lastError = errorInstance
        console.error(`[Fallback] ${modelConfig.name} attempt ${attempt} failed:`, errorInstance.message)

        // Get retry configuration based on error type
        const retryConfig = getRetryConfigForError(errorInstance.message)
        const errorClassification = classifyError(errorInstance)

        // If this is the last attempt for this model, or error is non-retryable, break to try next model
        if (attempt >= modelConfig.maxRetries || !errorClassification.isRetryable) {
          console.log(`[Fallback] ${modelConfig.name} exhausted (${attempt}/${modelConfig.maxRetries} attempts) or non-retryable error`)
          break
        }

        // Calculate delay for retry (use error-specific delays if available)
        const delayIndex = Math.min(attempt - 1, retryConfig.delaysMs.length - 1)
        const delay = retryConfig.delaysMs[delayIndex] || 30000

        console.log(`[Fallback] Retrying ${modelConfig.name} in ${delay}ms (error-type: ${getErrorType(errorInstance.message)})`)

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // If we get here, all attempts for this model failed
    // For the last model, rethrow the error
    if (modelIndex === MODEL_HIERARCHY.length - 1) {
      console.error(`[Fallback] All models exhausted`)
      throw lastError || new Error('All fallback models failed')
    }

    // Continue to next model
    console.log(`[Fallback] ${modelConfig.name} failed all attempts, trying next model...`)
  }

  // This should never be reached due to the throw in the last iteration
  throw new Error('All fallback models failed')
}

/**
 * Content Chunking Strategy for Large Documents
 */
async function generateWithChunking(
  client: GoogleGenAI,
  modelConfig: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  type: string
): Promise<{ resultText: string; chunksUsed: number } | null> {
  try {
    console.log(`[Chunking] Attempting chunked generation for ${type}`)

    // Extract document content from userPrompt (it's embedded in the prompt)
    const documentContentMatch = userPrompt.match(/Source Material:\s*([\s\S]*?)(?=\n\n##|$)/)
    if (!documentContentMatch) {
      console.error('[Chunking] Could not extract document content from prompt')
      return null
    }

    const documentContent = documentContentMatch[1].trim()
    const maxContentTokens = Math.floor(modelConfig.maxInputTokens * 0.6) // Reserve 40% for prompts
    const chunkSize = Math.floor(maxContentTokens * 4) // Convert tokens to characters

    // Split content into manageable chunks
    const chunks = splitIntoChunks(documentContent, chunkSize)
    console.log(`[Chunking] Split content into ${chunks.length} chunks`)

    if (chunks.length === 1) {
      // Single chunk - try with simplified prompt
      return await generateWithSimplifiedPrompt(client, modelConfig, systemPrompt, userPrompt, type)
    }

    // Multi-chunk strategy: generate for each chunk and combine
    const chunkResults: string[] = []

    for (let i = 0; i < Math.min(chunks.length, 3); i++) { // Limit to 3 chunks for performance
      const chunk = chunks[i]
      const chunkPrompt = userPrompt.replace(documentContent, chunk)

      console.log(`[Chunking] Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`)

      try {
        const response = await client.models.generateContent({
          model: modelConfig.name,
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + chunkPrompt }]
          }],
          config: {
            temperature: modelConfig.temperature,
            maxOutputTokens: Math.floor(modelConfig.baseOutputTokens / chunks.length),
            topK: modelConfig.topK,
          }
        })

        const chunkResult = response.text || ''
        if (chunkResult.length > 0) {
          chunkResults.push(chunkResult)
        }
      } catch (chunkError) {
        console.error(`[Chunking] Chunk ${i + 1} failed:`, chunkError)
        // Continue with other chunks
      }
    }

    if (chunkResults.length === 0) {
      console.error('[Chunking] All chunks failed')
      return null
    }

    // Combine chunk results intelligently based on study tool type
    const combinedResult = combineChunkResults(chunkResults, type)

    console.log(`[Chunking] Successfully combined ${chunkResults.length} chunks`)
    return {
      resultText: combinedResult,
      chunksUsed: chunkResults.length
    }

  } catch (error) {
    console.error('[Chunking] Chunking strategy failed:', error)
    return null
  }
}

/**
 * Simplified prompt strategy for edge cases
 */
async function generateWithSimplifiedPrompt(
  client: GoogleGenAI,
  modelConfig: ModelConfig,
  systemPrompt: string,
  userPrompt: string,
  type: string
): Promise<{ resultText: string; chunksUsed: number } | null> {
  try {
    console.log('[Simplified] Attempting generation with simplified prompt')

    // Create a simplified version of the prompt
    const simplifiedSystemPrompt = getSimplifiedSystemPrompt(type)
    const simplifiedUserPrompt = getSimplifiedUserPrompt(userPrompt, type)

    const response = await client.models.generateContent({
      model: modelConfig.name,
      contents: [{
        role: 'user',
        parts: [{ text: simplifiedSystemPrompt + '\n\n' + simplifiedUserPrompt }]
      }],
      config: {
        temperature: Math.min(modelConfig.temperature + 0.1, 1.0), // Slightly higher temperature
        maxOutputTokens: Math.floor(modelConfig.baseOutputTokens * 0.8), // Reduce output expectation
        topK: Math.max(modelConfig.topK - 10, 20), // Reduce topK
      }
    })

    const resultText = response.text || ''

    if (resultText.length < 50) {
      return null
    }

    console.log('[Simplified] Success with simplified prompt')
    return {
      resultText,
      chunksUsed: 1
    }

  } catch (error) {
    console.error('[Simplified] Simplified prompt failed:', error)
    return null
  }
}

/**
 * Utility functions for content processing
 */
function splitIntoChunks(content: string, chunkSize: number): string[] {
  if (content.length <= chunkSize) {
    return [content]
  }

  const chunks: string[] = []
  let start = 0

  while (start < content.length) {
    let end = start + chunkSize

    // Try to split at natural boundaries (paragraphs, sentences)
    if (end < content.length) {
      const lastParagraph = content.lastIndexOf('\n\n', end)
      const lastSentence = content.lastIndexOf('. ', end)
      const lastNewline = content.lastIndexOf('\n', end)

      if (lastParagraph > start + chunkSize * 0.5) {
        end = lastParagraph + 2
      } else if (lastSentence > start + chunkSize * 0.5) {
        end = lastSentence + 2
      } else if (lastNewline > start + chunkSize * 0.5) {
        end = lastNewline + 1
      }
    }

    chunks.push(content.slice(start, end).trim())
    start = end
  }

  return chunks.filter(chunk => chunk.length > 0)
}

function combineChunkResults(chunkResults: string[], type: string): string {
  if (chunkResults.length === 1) {
    return chunkResults[0]
  }

  // Combine results based on study tool type
  switch (type) {
    case 'flashcards':
      // For flashcards, merge JSON arrays
      return combineFlashcardChunks(chunkResults)

    case 'smart-summary':
      return `# Combined Summary\n\n${chunkResults.join('\n\n## Section Summary\n\n')}`

    case 'smart-notes':
      return `# Combined Notes\n\n${chunkResults.map((result, index) =>
        `## Section ${index + 1}\n\n${result}`
      ).join('\n\n')}`

    case 'study-guide':
      return `# Comprehensive Study Guide\n\n${chunkResults.map((result, index) =>
        `## Part ${index + 1}\n\n${result}`
      ).join('\n\n')}`

    default:
      return chunkResults.join('\n\n---\n\n')
  }
}

function combineFlashcardChunks(chunkResults: string[]): string {
  try {
    const allCards: any[] = []

    for (const chunk of chunkResults) {
      try {
        const cleanedChunk = chunk.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
        const cards = JSON.parse(cleanedChunk)
        if (Array.isArray(cards)) {
          allCards.push(...cards)
        }
      } catch (parseError) {
        console.error('[Combine] Failed to parse flashcard chunk:', parseError)
      }
    }

    // Ensure unique IDs
    allCards.forEach((card, index) => {
      if (!card.id) {
        card.id = `combined_${Date.now()}_${index}`
      }
    })

    return JSON.stringify(allCards, null, 2)
  } catch (error) {
    console.error('[Combine] Failed to combine flashcard chunks:', error)
    return chunkResults[0] // Return first chunk as fallback
  }
}

function getSimplifiedSystemPrompt(type: string): string {
  const basePrompts = {
    'flashcards': 'Create flashcards with questions and one-line answers in JSON format.',
    'smart-summary': 'Create a comprehensive summary of the content.',
    'smart-notes': 'Create organized notes from the content.',
    'study-guide': 'Create a study guide from the content.'
  }

  return basePrompts[type as keyof typeof basePrompts] || 'Analyze and organize the content.'
}

function getSimplifiedUserPrompt(originalPrompt: string, type: string): string {
  // Extract just the source material and basic requirements
  const documentContentMatch = originalPrompt.match(/Source Material:\s*([\s\S]*?)(?=\n\n##|$)/)
  const documentContent = documentContentMatch ? documentContentMatch[1].trim() : originalPrompt

  // Truncate if too long (rough approximation)
  const maxLength = 8000 // Roughly 2000 tokens
  const truncatedContent = documentContent.length > maxLength ?
    documentContent.slice(0, maxLength) + '\n\n[Content truncated for processing...]' :
    documentContent

  return `Content to process:\n\n${truncatedContent}\n\nGenerate a ${type.replace('-', ' ')} based on this content.`
}

interface StudyToolGenerateRequest {
  type: StudyToolPromptType
  documentId?: string
  conversationId?: string
  // Flashcard-specific options
  flashcardOptions?: {
    numberOfCards: 'fewer' | 'standard' | 'more'
    difficulty: 'easy' | 'medium' | 'hard'
    customInstructions?: string
  }
}

interface DocumentSection {
  id: string
  title: string
  page_start: number
  page_end: number
  parent_id?: string
}

interface DocumentChunk {
  id: string
  chunk_index: number
  content: string
  page_start: number
  page_end: number
  section_title?: string
  token_count: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function POST(req: NextRequest) {
  let type: StudyToolPromptType | undefined
  let documentId: string | undefined
  let conversationId: string | undefined
  let flashcardOptions: StudyToolGenerateRequest['flashcardOptions']

  try {
    const requestData: StudyToolGenerateRequest = await req.json()
    type = requestData.type
    documentId = requestData.documentId
    conversationId = requestData.conversationId
    flashcardOptions = requestData.flashcardOptions

    // Debug logging
    console.log('[StudyTools] API Request received:', { type, documentId, conversationId })
    console.log('[StudyTools] Environment check:', {
      hasGeminiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    // Validate request
    if (!type || !['study-guide', 'smart-summary', 'smart-notes', 'flashcards'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid study tool type' },
        { status: 400 }
      )
    }

    if (!documentId && !conversationId) {
      return NextResponse.json(
        { error: 'Either documentId or conversationId is required' },
        { status: 400 }
      )
    }

    // Verify Gemini API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    let documentContent = ''
    let documentTitle = 'Untitled Document'

    // Get content based on documentId or conversationId
    if (documentId) {
      console.log('[StudyTools] Fetching document:', documentId)

      // Fetch document and its content
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, title, processing_status, document_content')
        .eq('id', documentId)
        .single()

      console.log('[StudyTools] Document query result:', { document, docError })

      if (docError || !document) {
        console.error('[StudyTools] Document not found:', { documentId, docError })
        return NextResponse.json(
          { error: 'Document not found or inaccessible' },
          { status: 404 }
        )
      }

      if (document.processing_status !== 'completed') {
        return NextResponse.json(
          { error: 'Document is still processing. Please wait for processing to complete.' },
          { status: 422 }
        )
      }

      documentTitle = document.title

      // Check if document has content
      if (!document.document_content) {
        console.warn('[StudyTools] Document has no content:', documentId)
        return NextResponse.json(
          { error: 'Document has no content available for study tool generation' },
          { status: 422 }
        )
      }

      // Use document content directly
      documentContent = document.document_content
      console.log('[StudyTools] Using document content length:', documentContent.length)

    } else if (conversationId) {
      // Fetch conversation messages
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, title, document_id')
        .eq('id', conversationId)
        .single()

      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      documentTitle = conversation.title || 'Conversation'

      // Fetch conversation messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true })

      if (messagesError) {
        return NextResponse.json(
          { error: 'Failed to fetch conversation content' },
          { status: 500 }
        )
      }

      if (!messages || messages.length === 0) {
        return NextResponse.json(
          { error: 'Conversation has no content available for study tool generation' },
          { status: 422 }
        )
      }

      // Build conversation content
      documentContent = buildConversationContent(messages as Message[])

      // If conversation has an associated document, include document context
      if (conversation.document_id) {
        const { data: docData } = await supabase
          .from('documents')
          .select('document_content')
          .eq('id', conversation.document_id)
          .single()

        if (docData && docData.document_content) {
          documentContent = `# Document Context:\n\n${docData.document_content}\n\n# Conversation:\n\n${documentContent}`
        }
      }
    }

    // Validate content length
    if (documentContent.length < 100) {
      return NextResponse.json(
        { error: 'Insufficient content for generating meaningful study materials' },
        { status: 422 }
      )
    }

    // Get the appropriate prompts for the study tool type
    const { systemPrompt, userPrompt } = getStudyToolPrompt(
      type as StudyToolPromptType,
      documentContent,
      documentTitle,
      flashcardOptions ? {
        numberOfCards: flashcardOptions.numberOfCards,
        difficulty: flashcardOptions.difficulty,
        customInstructions: flashcardOptions.customInstructions
      } : undefined
    )

    console.log(`[StudyTools] Generating ${type} for "${documentTitle}" (${documentContent.length} chars)`)

    // Generate study tool using multi-model fallback strategy
    const startTime = Date.now()
    const { resultText, modelUsed, duration: generationDuration } = await generateWithFallback(
      systemPrompt,
      userPrompt,
      type,
      documentContent.length
    )

    const duration = Date.now() - startTime
    console.log(`[StudyTools] Generated ${type} in ${duration}ms using ${modelUsed} (${resultText.length} chars)`)

    // Special handling for flashcards - parse JSON response
    let processedContent: string = resultText
    let flashcardData = null

    if (type === 'flashcards') {
      try {
        // Parse the JSON response from the AI
        const cleanedText = resultText.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
        flashcardData = JSON.parse(cleanedText)

        if (!Array.isArray(flashcardData)) {
          throw new Error('Flashcard data is not an array')
        }

        // Validate flashcard structure
        flashcardData.forEach((card, index) => {
          if (!card.question || !card.answer || !card.id) {
            throw new Error(`Invalid flashcard at index ${index}: missing required fields`)
          }
        })

        console.log(`[StudyTools] Successfully parsed ${flashcardData.length} flashcards`)

        // Keep the original JSON for content field
        processedContent = resultText
      } catch (error) {
        console.error('[StudyTools] Failed to parse flashcard JSON:', error)
        return NextResponse.json(
          { error: 'Failed to parse generated flashcards. The AI response was not in the expected format.' },
          { status: 500 }
        )
      }
    }

    // Generate appropriate title
    const generatedTitle = generateStudyToolTitle(type as StudyToolPromptType, documentTitle)

    // Save to database - map frontend types to database types
    const dbType = type === 'smart-summary' ? 'summary' :
                   type === 'smart-notes' ? 'notes' :
                   type === 'study-guide' ? 'study_guide' :
                   type === 'flashcards' ? 'flashcards' : type

    let outputId: string | null = null

    // For conversation-based study tools, we need to find the associated document or use a workaround
    let saveDocumentId = documentId
    if (!saveDocumentId && conversationId) {
      // For conversation-based study tools, try to get the document from conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('document_id')
        .eq('id', conversationId)
        .single()

      saveDocumentId = conversation?.document_id
    }

    try {
      const insertData: {
        section_id: null
        overall: boolean
        type: string
        document_id?: string
        payload: Record<string, unknown>
      } = {
        section_id: null,
        overall: true,
        type: dbType,
        payload: {
          title: generatedTitle,
          content: processedContent,
          type: type,
          documentId: documentId,
          conversationId: conversationId,
          createdAt: new Date().toISOString(),
          // Include flashcard-specific data
          ...(type === 'flashcards' && flashcardData ? {
            cards: flashcardData,
            options: flashcardOptions,
            metadata: {
              model: modelUsed,
              duration: generationDuration,
              contentLength: processedContent.length,
              sourceContentLength: documentContent.length,
              totalCards: flashcardData.length,
              avgDifficulty: flashcardOptions?.difficulty || 'medium',
              fallbackStrategy: modelUsed.includes('chunked') || modelUsed.includes('flash') ? 'applied' : 'none'
            }
          } : {
            metadata: {
              model: modelUsed,
              duration: generationDuration,
              contentLength: processedContent.length,
              sourceContentLength: documentContent.length,
              fallbackStrategy: modelUsed.includes('chunked') || modelUsed.includes('flash') ? 'applied' : 'none'
            }
          })
        }
      }

      // Add document_id if we have one, otherwise skip it for conversation-only study tools
      if (saveDocumentId) {
        insertData.document_id = saveDocumentId
      } else {
        // For conversation-only study tools, we still need a document_id for the schema
        // Create a temporary placeholder or modify schema - for now log and skip database save
        console.warn('[StudyTools] No document_id available for conversation-based study tool, skipping database save')
        console.log('[StudyTools] Study tool generated successfully but not saved to database - conversation-only mode')
      }

      if (saveDocumentId) {
        const { data: output, error: saveError } = await supabase
          .from('outputs')
          .insert(insertData)
          .select('id')
          .single()

        if (saveError) {
          console.error('[StudyTools] Failed to save to database:', saveError)
        } else {
          outputId = output?.id || null
          console.log('[StudyTools] Saved to database with ID:', outputId)
        }
      }
    } catch (saveError) {
      console.error('[StudyTools] Database save error:', saveError)
    }

    return NextResponse.json({
      success: true,
      id: outputId,
      title: generatedTitle,
      content: processedContent,
      type,
      documentId,
      conversationId,
      // Include flashcard-specific data in response
      ...(type === 'flashcards' && flashcardData ? {
        cards: flashcardData,
        options: flashcardOptions
      } : {}),
      metadata: {
        generatedAt: new Date().toISOString(),
        model: modelUsed,
        duration: generationDuration,
        contentLength: processedContent.length,
        sourceContentLength: documentContent.length,
        fallbackStrategy: modelUsed.includes('chunked') || modelUsed.includes('flash') ? 'applied' : 'none',
        ...(type === 'flashcards' && flashcardData ? {
          totalCards: flashcardData.length,
          avgDifficulty: flashcardOptions?.difficulty || 'medium'
        } : {})
      }
    })

  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    console.error('[StudyTools] Generation failed:', errorInstance)

    // Log detailed error information for debugging
    console.error('[StudyTools] Error name:', errorInstance.name)
    console.error('[StudyTools] Error message:', errorInstance.message)
    console.error('[StudyTools] Error stack:', errorInstance.stack)

    // Classify error for retry eligibility
    const errorClassification = classifyError(errorInstance)
    console.log('[StudyTools] Error classification:', errorClassification)

    // Get reason with fallback
    const reason = errorClassification.reason || 'unknown error'

    // Prepare retry payload for background processing (only if we have type assigned)
    const retryPayload = type ? {
      type,
      documentId,
      conversationId,
      flashcardOptions,
      timestamp: Date.now(),
      requestId: crypto.randomUUID()
    } : {
      error: 'Invalid request structure',
      timestamp: Date.now(),
      requestId: crypto.randomUUID()
    }

    if (errorClassification.isRetryable && type) {
      // Add to background retry queue
      const retryId = addRetryAttempt(
        'study-tool-generation',
        retryPayload,
        errorInstance,
        {
          maxRetries: 8, // Enhanced retry count for study tool generation
          baseDelayMs: errorClassification.retryAfterMs || 45000, // Use classification delay or default
          exponentialBackoff: true,
          jitterMs: 10000 // Increased jitter for Google AI
        }
      )

      console.log(`[StudyTools] Added to retry queue with ID: ${retryId}`)

      // Return appropriate user-facing message based on error type
      if (reason.includes('rate limit')) {
        return NextResponse.json(
          {
            error: 'Study tool generation temporarily rate limited. Your request has been queued for automatic retry.',
            retryId,
            retryable: true,
            reason,
            estimatedRetryIn: Math.round((errorClassification.retryAfterMs || 60000) / 1000)
          },
          { status: 429 }
        )
      }

      if (reason.includes('unavailable') || reason.includes('overloaded')) {
        return NextResponse.json(
          {
            error: 'AI service temporarily unavailable. Your request has been queued for automatic retry.',
            retryId,
            retryable: true,
            reason,
            estimatedRetryIn: Math.round((errorClassification.retryAfterMs || 45000) / 1000)
          },
          { status: 503 }
        )
      }

      if (reason.includes('network') || reason.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Network error occurred. Your request has been queued for automatic retry.',
            retryId,
            retryable: true,
            reason,
            estimatedRetryIn: Math.round((errorClassification.retryAfterMs || 60000) / 1000)
          },
          { status: 503 }
        )
      }

      // Generic retryable error
      return NextResponse.json(
        {
          error: 'Study tool generation failed but will be retried automatically in the background.',
          retryId,
          retryable: true,
          reason,
          estimatedRetryIn: Math.round((errorClassification.retryAfterMs || 60000) / 1000)
        },
        { status: 500 }
      )
    }

    // Handle case where type is not defined (early error in request parsing)
    if (!type) {
      return NextResponse.json(
        {
          error: 'Invalid request format. Please check your request structure.',
          retryable: false,
          reason: 'Invalid request format'
        },
        { status: 400 }
      )
    }

    // Non-retryable errors - provide specific guidance
    if (reason.includes('authentication') || reason.includes('api key')) {
      return NextResponse.json(
        {
          error: 'AI service configuration error. Please contact support if this persists.',
          retryable: false,
          reason
        },
        { status: 500 }
      )
    }

    if (reason.includes('safety') || reason.includes('content')) {
      return NextResponse.json(
        {
          error: 'Content not suitable for study tool generation. Please try with different content.',
          retryable: false,
          reason
        },
        { status: 400 }
      )
    }

    if (reason.includes('invalid') || reason.includes('bad request')) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters. Please check your input and try again.',
          retryable: false,
          reason
        },
        { status: 400 }
      )
    }

    // Fallback for non-retryable errors
    return NextResponse.json(
      {
        error: 'Failed to generate study tool. Please try again with different content or parameters.',
        retryable: false,
        reason,
        details: errorInstance.message
      },
      { status: 500 }
    )
  }
}


/**
 * Build conversation content from messages
 */
function buildConversationContent(messages: Message[]): string {
  let content = ''

  for (const message of messages) {
    const timestamp = new Date(message.created_at).toLocaleString()
    const roleLabel = message.role === 'user' ? 'User' : 'Assistant'

    content += `## ${roleLabel} (${timestamp})\n\n${message.content}\n\n---\n\n`
  }

  return content.trim()
}