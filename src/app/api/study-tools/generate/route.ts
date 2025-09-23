import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import { getStudyToolPrompt, generateStudyToolTitle, type StudyToolPromptType } from '@/lib/study-tools-prompts'
import { classifyError, addRetryAttempt } from '@/lib/retry-manager'

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
  type: string
): Promise<FallbackResult> {
  const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })

  // Estimate token count (rough approximation: 1 token ≈ 4 characters)
  const estimatedTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4)
  console.log(`[Fallback] Estimated input tokens: ${estimatedTokens}`)

  for (let modelIndex = 0; modelIndex < MODEL_HIERARCHY.length; modelIndex++) {
    const modelConfig = MODEL_HIERARCHY[modelIndex]
    const modelStartTime = Date.now()

    console.log(`[Fallback] Attempting generation with ${modelConfig.name} (tokens: ${estimatedTokens}/${modelConfig.maxInputTokens})`)

    // Check if content fits within model limits - if too large, skip to next model
    if (estimatedTokens > modelConfig.maxInputTokens) {
      console.log(`[Fallback] Content too large for ${modelConfig.name} (${estimatedTokens} > ${modelConfig.maxInputTokens}), trying next model...`)
      continue
    }

    // Per-model retry loop
    let lastError: Error | null = null
    for (let attempt = 1; attempt <= modelConfig.maxRetries; attempt++) {
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
      type
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
              fallbackStrategy: modelUsed.includes('flash') ? 'applied' : 'none'
            }
          } : {
            metadata: {
              model: modelUsed,
              duration: generationDuration,
              contentLength: processedContent.length,
              sourceContentLength: documentContent.length,
              fallbackStrategy: modelUsed.includes('flash') ? 'applied' : 'none'
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