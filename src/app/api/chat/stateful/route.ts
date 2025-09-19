import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildContextPrompt } from '@/lib/smart-context'
import { isEmbeddingsReady } from '@/lib/embeddings'
import {
  createStatefulChat,
  sendStatefulMessage,
  getSessionInfo,
  validateGeminiConfig,
  type CreateChatOptions,
  type SendMessageOptions
} from '@/lib/genai-client'
import type { GeminiModelKey } from '@/lib/ai-config'
import { GeminiModelSelector } from '@/lib/ai-config'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

// Session cache to avoid re-creating sessions for same conversation
const conversationSessionCache = new Map<string, string>()

interface StatefulChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface StatefulChatRequest {
  messages: StatefulChatMessage[]
  chatType: 'course' | 'lesson' | 'document' | 'general'
  documentId?: string
  selectedDocuments?: Array<{id: string, title: string}>
  conversationId?: string
  preferredModel?: GeminiModelKey
}

export async function POST(req: NextRequest) {
  try {
    // Validate configuration
    const validation = validateGeminiConfig()
    if (!validation.isValid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const {
      messages,
      chatType,
      documentId,
      selectedDocuments,
      conversationId,
      preferredModel
    }: StatefulChatRequest = await req.json()

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!conversationId) {
      return new Response(
        JSON.stringify({ error: 'Conversation ID required for stateful chat' }),
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

    // Select model
    const selectedModelKey: GeminiModelKey = preferredModel || 'FLASH'
    const modelConfig = GeminiModelSelector.getModelConfig(selectedModelKey)

    console.log(`[StatefulChat] Processing message for conversation: ${conversationId}`)
    console.log(`[StatefulChat] Using model: ${modelConfig.displayName}`)
    console.log(`[StatefulChat] Message count: ${messages.length}`)

    // Check if we have an existing session for this conversation
    let sessionId = conversationSessionCache.get(conversationId)
    let isNewSession = false

    if (!sessionId || !getSessionInfo(sessionId)) {
      // Create new session
      isNewSession = true
      console.log(`[StatefulChat] Creating new session for conversation: ${conversationId}`)

      // Build system prompt and context
      let systemPrompt = getSystemPrompt(chatType, documentId, selectedModelKey)
      let documentContext = ''

      // Handle document context for new sessions
      if (documentId || selectedDocuments?.length) {
        const documentsToProcess = selectedDocuments?.length
          ? selectedDocuments
          : documentId
          ? [{ id: documentId, title: 'Document' }]
          : []

        if (documentsToProcess.length > 0) {
          try {
            // Fetch document content
            const { data: documents, error: docError } = await supabase
              .from('documents')
              .select('id, title, page_count, processing_status, document_content')
              .in('id', documentsToProcess.map(d => d.id))

            if (!docError && documents && documents.length > 0) {
              console.log(`[StatefulChat] Found ${documents.length} documents`)

              const processedDocs = documents
                .filter(doc => doc.document_content && doc.document_content.trim())
                .map(doc => ({
                  id: doc.id,
                  title: doc.title,
                  content: doc.document_content
                }))

              if (processedDocs.length > 0) {
                const totalTokens = processedDocs.reduce((sum, doc) =>
                  sum + Math.ceil(doc.content.length / 4), 0)

                console.log(`[StatefulChat] Total document tokens: ${totalTokens.toLocaleString()}`)

                if (totalTokens >= 100000) {
                  // Use Smart RAG for large documents
                  console.log(`[StatefulChat] Using Smart RAG for large document collection`)

                  try {
                    const embeddingsAvailable = await isEmbeddingsReady()
                    const combinedContent = processedDocs.map(doc =>
                      `=== ${doc.title} ===\n${doc.content}`).join('\n\n')

                    documentContext = await buildContextPrompt(
                      lastMessage.content,
                      `${processedDocs.length} Documents`,
                      combinedContent,
                      {
                        maxTokens: 200000,
                        chunkSize: 800,
                        overlap: 200,
                        useSemanticSearch: embeddingsAvailable,
                        hybridWeight: 0.6,
                        generateEmbeddings: true,
                        minRelevanceScore: 0.05,
                        maxChunks: 20
                      }
                    )
                  } catch (contextError) {
                    console.warn('[StatefulChat] RAG failed, using simple context:', contextError)
                    documentContext = processedDocs.map(doc =>
                      `\n\n=== ${doc.title} ===\n${doc.content.slice(0, 200000)}`
                    ).join('').slice(0, 800000)
                  }
                } else {
                  // Simple concatenation for smaller documents
                  console.log(`[StatefulChat] Using simple concatenation for small documents`)
                  documentContext = processedDocs.map(doc =>
                    `\n\n=== ${doc.title} ===\n${doc.content}`
                  ).join('')
                }
              }
            }
          } catch (error) {
            console.error('[StatefulChat] Error fetching document context:', error)
          }
        }
      }

      // Convert conversation history to GenAI format (excluding the last message)
      const conversationHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.content }]
      }))

      // Create stateful chat session
      const createOptions: CreateChatOptions = {
        conversationId,
        modelKey: selectedModelKey,
        systemPrompt: systemPrompt + (documentContext || ''),
        documentContext,
        history: conversationHistory
      }

      sessionId = await createStatefulChat(createOptions)
      conversationSessionCache.set(conversationId, sessionId)

      console.log(`[StatefulChat] Created session: ${sessionId}`)
    } else {
      console.log(`[StatefulChat] Using existing session: ${sessionId}`)
    }

    // Send message to session and stream response
    console.log(`[StatefulChat] Sending message to session: ${sessionId}`)

    const sendOptions: SendMessageOptions = {
      message: lastMessage.content,
      sessionId
    }

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = ''
          let tokenCount = 0

          for await (const chunk of sendStatefulMessage(sendOptions)) {
            if (chunk.text) {
              fullResponse += chunk.text

              // Send chunk in AI SDK v3 format for compatibility
              const data = JSON.stringify(chunk.text)
              controller.enqueue(new TextEncoder().encode(`0:${data}\n`))
            }

            if (chunk.isComplete) {
              // Send completion metadata
              const metadata = {
                usage: {
                  totalTokens: chunk.usage?.totalTokens || Math.ceil(fullResponse.length / 4),
                  promptTokens: chunk.usage?.promptTokens,
                  completionTokens: chunk.usage?.completionTokens
                },
                model: modelConfig.displayName,
                modelKey: selectedModelKey,
                sessionId,
                isNewSession
              }

              const metadataData = JSON.stringify(metadata)
              controller.enqueue(new TextEncoder().encode(`8:${metadataData}\n`))

              // Save message to database
              if (conversationId) {
                try {
                  await saveMessageToDatabase({
                    conversationId,
                    role: 'user',
                    content: lastMessage.content,
                    metadata: {
                      chatType,
                      documentId,
                      modelUsed: selectedModelKey,
                      sessionId,
                      isNewSession
                    }
                  })

                  await saveMessageToDatabase({
                    conversationId,
                    role: 'assistant',
                    content: fullResponse,
                    metadata: {
                      model: modelConfig.displayName,
                      tokens: metadata.usage.totalTokens,
                      modelKey: selectedModelKey,
                      sessionId,
                      isNewSession
                    }
                  })
                } catch (error) {
                  console.error('[StatefulChat] Failed to save messages:', error)
                }
              }

              controller.close()
            }
          }
        } catch (error) {
          console.error('[StatefulChat] Streaming error:', error)
          const errorData = JSON.stringify({ error: error.message })
          controller.enqueue(new TextEncoder().encode(`error:${errorData}\n`))
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    console.error('[StatefulChat] API error:', errorInstance)

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
  metadata
}: {
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
}) {
  try {
    // Skip database saving if conversation ID is not a proper UUID
    if (!conversationId || !conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('[StatefulChat] Skipping save for non-UUID conversation ID:', conversationId)
      return
    }

    // Check if conversation exists, create if not
    const { error: convCheckError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single()

    if (convCheckError && convCheckError.code === 'PGRST116') {
      console.log('[StatefulChat] Creating missing conversation:', conversationId)
      const { error: createError } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          document_id: null,
          title: content.slice(0, 50) + (content.length > 50 ? '...' : '')
        })

      if (createError) {
        console.warn('[StatefulChat] Failed to create conversation:', createError.message)
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
        metadata
      })

    if (error) {
      console.warn('[StatefulChat] Failed to save message, continuing without persistence:', error.message)
      return
    }

    console.log('[StatefulChat] Successfully saved message to conversation:', conversationId)
  } catch (error) {
    console.warn('[StatefulChat] Database save failed, continuing without persistence:', error)
  }
}