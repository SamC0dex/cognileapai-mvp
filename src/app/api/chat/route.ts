import { NextRequest } from 'next/server'
import { streamText, convertToCoreMessages } from 'ai'
import { GeminiModelSelector, validateGeminiConfig, type MessageContext } from '@/lib/ai-config'
import type { GeminiModelKey } from '@/lib/ai-config'
import { createClient } from '@supabase/supabase-js'
import { buildContextPrompt, buildContextPromptSync } from '@/lib/smart-context'
import { isEmbeddingsReady } from '@/lib/embeddings'
// import { addRetryAttempt, classifyError, type RetryAttempt } from '@/lib/retry-manager'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface ChatRequest {
  messages: ChatMessage[]
  chatType: 'course' | 'lesson' | 'document' | 'general'
  documentId?: string
  conversationId?: string
  preferredModel?: GeminiModelKey
}

export async function POST(req: NextRequest) {
  try {
    // Validate Gemini configuration
    const validation = validateGeminiConfig()
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { messages, chatType, documentId, conversationId, preferredModel }: ChatRequest = await req.json()

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the latest user message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Last message must be from user' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Analyze message context for model selection
    const messageContext: MessageContext = {
      content: lastMessage.content,
      chatType: chatType || 'general',
      isFollowUp: messages.length > 2,
      messageHistory: messages.length,
      hasDocumentContext: !!documentId,
      requestedOutputType: detectRequestedOutputType(lastMessage.content)
    }

    // Select model: honor explicit preference, else auto-select
    const selectedModelKey: GeminiModelKey = preferredModel || GeminiModelSelector.selectModel(messageContext)
    const model = GeminiModelSelector.getModelInstance(selectedModelKey)
    const modelConfig = GeminiModelSelector.getModelConfig(selectedModelKey)

    console.log(`[AI] Using ${modelConfig.displayName} for ${chatType} chat (${messageContext.hasDocumentContext ? 'with' : 'without'} document context)`)

    // Convert messages to format expected by AI SDK
    const coreMessages = convertToCoreMessages(messages)

    // Get document context if documentId is provided
    let systemPrompt = getSystemPrompt(chatType, documentId, selectedModelKey)
    const documentCitations: any[] = []

    if (documentId) {
      console.log(`[AI] Document chat requested for: ${documentId}`)

      try {
        // Get document info and actual content
        const { data: document, error: docError } = await supabase
          .from('documents')
          .select('id, title, page_count, processing_status, document_content')
          .eq('id', documentId)
          .single()

        if (!docError && document) {
          console.log(`[AI] Found document: ${document.title} (${document.page_count} pages)`)

          if (document.document_content && document.document_content.trim()) {
            console.log(`[AI] Using document content (${document.document_content.length} characters)`)

            // Check if FREE embeddings system is ready (with fallback)
            let embeddingsAvailable = false
            try {
              embeddingsAvailable = await isEmbeddingsReady()
              console.log(`[AI] FREE embeddings system: ${embeddingsAvailable ? 'READY' : 'LOADING'}`)
            } catch (embedError) {
              console.log(`[AI] Embeddings system error, using keyword-only search:`, embedError)
              embeddingsAvailable = false
            }

            // Use enhanced smart context system with FREE semantic search
            const userQuery = lastMessage.content

            try {
              // Try context building with semantic search if available
              const contextPrompt = await buildContextPrompt(
                userQuery,
                document.title,
                document.document_content,
                {
                  maxTokens: 8000, // Increased for comprehensive coverage
                  chunkSize: 800, // Smaller chunks for better granularity
                  overlap: 200,
                  useSemanticSearch: embeddingsAvailable,
                  hybridWeight: 0.6, // 60% semantic, 40% keyword for overview queries
                  generateEmbeddings: true, // Enable embeddings for semantic search
                  minRelevanceScore: 0.05, // Lower threshold for better coverage
                  maxChunks: 12 // Allow more chunks for comprehensive search
                }
              )

              console.log(`[AI] RAG context assembled using ${embeddingsAvailable ? 'semantic + keyword' : 'keyword-only'} search`)
              systemPrompt = getSystemPrompt('document', documentId, selectedModelKey) + '\n\n' + contextPrompt

            } catch (contextError) {
              console.warn(`[AI] Context building failed, using simple fallback:`, contextError)

              // Simple fallback: use document title and first 4000 characters
              const fallbackContent = document.document_content.slice(0, 4000)
              systemPrompt = getSystemPrompt('document', documentId, selectedModelKey) +
                '\n\nDocument Content:\n' + fallbackContent

              console.log(`[AI] Simple fallback context used`)
            }
          } else {
            console.log(`[AI] No document content available, using metadata only`)

            // Fallback for documents without extracted content
            systemPrompt = getSystemPrompt('document', documentId, selectedModelKey) +
              `\n\nYou're helping with a document titled "${document.title}" (${document.page_count} pages). ` +
              `The document content is being processed. For now, help the user by asking them to share ` +
              `specific text or sections they'd like to discuss.`
          }
        } else {
          console.error('[AI] Failed to fetch document:', docError)
        }
      } catch (error) {
        console.error('[AI] Error fetching document context:', error)
      }
    }

    // Create the streaming response
    const result = await streamText({
      model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...coreMessages
      ],
      ...GeminiModelSelector.getGenerationSettings(selectedModelKey),
      onFinish: async (result) => {
        // Save conversation to database
        if (conversationId) {
          try {
            await saveMessageToDatabase({
              conversationId,
              role: 'user',
              content: lastMessage.content,
              metadata: {
                chatType,
                documentId,
                modelUsed: selectedModelKey
              }
            })

            await saveMessageToDatabase({
              conversationId,
              role: 'assistant',
              content: result.text,
              metadata: {
                model: modelConfig.displayName,
                tokens: result.usage?.totalTokens,
                finishReason: result.finishReason,
                modelKey: selectedModelKey
              },
              citations: documentCitations.length > 0 ? documentCitations : undefined
            })
          } catch (error) {
            console.error('[DB] Failed to save messages:', error)
          }
        }
      }
    })

    return result.toDataStreamResponse()

  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    console.error('[API] Chat error:', errorInstance)

    return new Response(
      JSON.stringify({
        error: 'An error occurred while processing your request',
        details: errorInstance.message
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

function detectRequestedOutputType(content: string): MessageContext['requestedOutputType'] {
  const lowerContent = content.toLowerCase()
  
  if (lowerContent.includes('summary') || lowerContent.includes('summarize')) {
    return 'summary'
  }
  if (lowerContent.includes('notes') || lowerContent.includes('note')) {
    return 'notes'
  }
  if (lowerContent.includes('study guide') || lowerContent.includes('guide')) {
    return 'study_guide'
  }
  if (lowerContent.includes('flashcard') || lowerContent.includes('quiz')) {
    return 'flashcards'
  }
  if (lowerContent.includes('analy') || lowerContent.includes('evaluate')) {
    return 'analysis'
  }
  
  return undefined
}

function getSystemPrompt(chatType: string, documentId?: string, modelKey?: GeminiModelKey): string {
  const modelConfig = modelKey ? GeminiModelSelector.getModelConfig(modelKey) : null
  const basePrompt = `You are CogniLeap AI, an intelligent learning assistant powered by ${modelConfig?.displayName || 'Google Gemini'}. You're designed to help students and educators create, understand, and master educational content.`
  
  const contextPrompts = {
    course: `You are helping to create and plan comprehensive courses. Focus on:
- Structured learning objectives and outcomes
- Logical progression from basic to advanced concepts  
- Engaging activities and assessments
- Real-world applications and examples
- Clear module organization and timelines
- Different learning styles and accessibility

Provide detailed, actionable course planning advice with specific examples.`,

    lesson: `You are helping to design individual lessons and learning experiences. Focus on:
- Clear learning objectives for single sessions
- Engaging opening activities and hooks
- Structured content delivery methods
- Interactive elements and student participation  
- Assessment strategies and exit tickets
- Time management and pacing
- Materials and resources needed

Create practical, implementable lesson plans with specific activities.`,

    document: `You are analyzing and helping with document-based learning. Focus on:
- Extracting key concepts and main ideas
- Creating structured study materials
- Identifying relationships between concepts
- Generating practice questions and activities
- Summarizing complex information clearly
- Creating visual learning aids when helpful
- Connecting content to broader topics

${documentId ? 'Reference the uploaded document context when providing responses.' : ''}`,

    general: `You are a helpful learning companion. Focus on:
- Clear, educational explanations
- Encouraging curiosity and deeper thinking
- Providing examples and analogies
- Breaking down complex topics
- Offering study strategies and tips
- Supporting different learning preferences

Be encouraging, patient, and adapt your teaching style to the user's needs.`
  }

  const rolePrompt = contextPrompts[chatType as keyof typeof contextPrompts] || contextPrompts.general

  return `${basePrompt}

${rolePrompt}

Guidelines:
- Use clear, structured formatting with headers, bullet points, and numbered lists
- Include practical examples and real-world applications
- Be encouraging and supportive in your tone
- Ask clarifying questions when needed
- Provide actionable advice and next steps
- Use code blocks for any technical content or structured data
- Keep responses focused and relevant to the educational context`
}

async function saveMessageToDatabase({
  conversationId,
  role,
  content,
  metadata,
  citations
}: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
  citations?: any[]
}) {
  try {
    // Skip database saving if conversation ID is not a proper UUID
    if (!conversationId || !conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('[DB] Skipping save for non-UUID conversation ID:', conversationId)
      return
    }

    // Check if conversation exists, create if not
    const { error: convCheckError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single()

    if (convCheckError && convCheckError.code === 'PGRST116') {
      // Conversation doesn't exist, create it
      console.log('[DB] Creating missing conversation:', conversationId)
      const { error: createError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          document_id: null,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
        })
      
      if (createError) {
        console.warn('[DB] Failed to create conversation:', createError.message)
        return
      }
    }

    // Get current message count for sequence number
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    const sequenceNumber = (count || 0) + 1

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        sequence_number: sequenceNumber,
        metadata,
        citations: citations || null
      })

    if (error) {
      console.warn('[DB] Failed to save message, continuing without persistence:', error.message)
      return
    }

    // Update conversation timestamp (let database handle updated_at with trigger)
    await supabase
      .from('conversations')
      .update({ title: content.slice(0, 50) + (content.length > 50 ? '...' : '') })
      .eq('id', conversationId)

    console.log('[DB] Successfully saved message to conversation:', conversationId)
  } catch (error) {
    console.warn('[DB] Database save failed, continuing without persistence:', error)
  }
}
