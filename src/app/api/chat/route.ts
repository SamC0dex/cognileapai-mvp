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

// Conversation-level document context cache to prevent re-fetching
interface ConversationContext {
  documents: Array<{
    id: string
    title: string
    content: string
    tokenCount: number
  }>
  totalTokens: number
  systemPrompt?: string
  lastUpdated: number
}

const conversationContextCache = new Map<string, ConversationContext>()
const CONTEXT_CACHE_TTL = 30 * 60 * 1000 // 30 minutes
const RAG_THRESHOLD = 100_000 // Use RAG only for 100K+ tokens

// Clean expired cache entries
function cleanExpiredCache() {
  const now = Date.now()
  for (const [key, context] of conversationContextCache.entries()) {
    if (now - context.lastUpdated > CONTEXT_CACHE_TTL) {
      conversationContextCache.delete(key)
    }
  }
}

// Determine context strategy based on token count
function determineContextStrategy(totalTokens: number): 'SIMPLE' | 'RAG' {
  return totalTokens >= RAG_THRESHOLD ? 'RAG' : 'SIMPLE'
}

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
  selectedDocuments?: Array<{id: string, title: string}> // Multi-document support
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

    const { messages, chatType, documentId, selectedDocuments, conversationId, preferredModel }: ChatRequest = await req.json()

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

    // Handle document context with caching and conditional RAG
    if (documentId || selectedDocuments?.length) {
      // Clean expired cache entries
      cleanExpiredCache()

      // Determine documents to process (priority: selectedDocuments > single documentId)
      const documentsToProcess = selectedDocuments?.length
        ? selectedDocuments
        : documentId
        ? [{ id: documentId, title: 'Document' }]
        : []

      if (documentsToProcess.length > 0) {
        console.log(`[AI] Document chat requested for: ${documentsToProcess.map(d => d.id).join(', ')}`)

        // Check conversation cache first
        let conversationContext = conversationId ? conversationContextCache.get(conversationId) : null

        // If cache miss or documents changed, fetch and process
        const currentDocIds = documentsToProcess.map(d => d.id).sort().join(',')
        const cachedDocIds = conversationContext?.documents.map(d => d.id).sort().join(',')

        if (!conversationContext || cachedDocIds !== currentDocIds) {
          console.log(`[AI] Cache miss or document change - fetching document context`)

          try {
            // Fetch all document contents
            const { data: documents, error: docError } = await supabase
              .from('documents')
              .select('id, title, page_count, processing_status, document_content')
              .in('id', documentsToProcess.map(d => d.id))

            if (!docError && documents && documents.length > 0) {
              console.log(`[AI] Found ${documents.length} documents`)

              // Process documents and estimate tokens
              let totalTokens = 0
              const processedDocs = documents
                .filter(doc => doc.document_content && doc.document_content.trim())
                .map(doc => {
                  const tokenCount = Math.ceil(doc.document_content.length / 4) // Rough estimation
                  totalTokens += tokenCount
                  return {
                    id: doc.id,
                    title: doc.title,
                    content: doc.document_content,
                    tokenCount
                  }
                })

              // Determine context strategy
              const strategy = determineContextStrategy(totalTokens)
              console.log(`[AI] Total tokens: ${totalTokens.toLocaleString()}, Strategy: ${strategy}`)

              let contextPrompt = ''

              if (strategy === 'SIMPLE') {
                // Simple concatenation for small documents (< 100K tokens)
                console.log(`[AI] Using SIMPLE concatenation (${totalTokens.toLocaleString()} tokens)`)
                contextPrompt = processedDocs.map(doc =>
                  `\n\n=== ${doc.title} ===\n${doc.content}`
                ).join('')
              } else {
                // Advanced RAG for large document collections (>= 100K tokens)
                console.log(`[AI] Using SMART RAG (${totalTokens.toLocaleString()} tokens)`)

                try {
                  // Check if embeddings system is ready
                  let embeddingsAvailable = false
                  try {
                    embeddingsAvailable = await isEmbeddingsReady()
                    console.log(`[AI] FREE embeddings system: ${embeddingsAvailable ? 'READY' : 'LOADING'}`)
                  } catch (embedError) {
                    console.log(`[AI] Embeddings system error, using keyword-only search:`, embedError)
                    embeddingsAvailable = false
                  }

                  // For multi-document RAG, combine all content and use smart context
                  const combinedContent = processedDocs.map(doc => `=== ${doc.title} ===\n${doc.content}`).join('\n\n')
                  const userQuery = lastMessage.content

                  contextPrompt = await buildContextPrompt(
                    userQuery,
                    `${processedDocs.length} Documents`,
                    combinedContent,
                    {
                      maxTokens: 200000, // 200K optimal limit
                      chunkSize: 800,
                      overlap: 200,
                      useSemanticSearch: embeddingsAvailable,
                      hybridWeight: 0.6, // 60% semantic, 40% keyword
                      generateEmbeddings: true,
                      minRelevanceScore: 0.05,
                      maxChunks: 20 // More chunks for multi-document
                    }
                  )

                  console.log(`[AI] Multi-document RAG context assembled using ${embeddingsAvailable ? 'semantic + keyword' : 'keyword-only'} search`)
                } catch (contextError) {
                  console.warn(`[AI] RAG failed, using simple fallback:`, contextError)
                  // Fallback to simple truncation
                  const truncatedContent = processedDocs.map(doc =>
                    `=== ${doc.title} ===\n${doc.content.slice(0, 200000)}`
                  ).join('\n\n').slice(0, 800000) // Max 200K tokens
                  contextPrompt = '\n\nDocument Content:\n' + truncatedContent
                }
              }

              // Update cache
              if (conversationId) {
                conversationContextCache.set(conversationId, {
                  documents: processedDocs,
                  totalTokens,
                  systemPrompt: systemPrompt + contextPrompt,
                  lastUpdated: Date.now()
                })
              }

              // Update system prompt with context
              systemPrompt = getSystemPrompt('document', documentsToProcess[0].id, selectedModelKey) + contextPrompt

            } else {
              console.log(`[AI] No document content available`)
              systemPrompt = getSystemPrompt('document', documentsToProcess[0].id, selectedModelKey) +
                `\n\nYou're helping with ${documentsToProcess.length} document(s). The content is being processed.`
            }
          } catch (error) {
            console.error('[AI] Error fetching document context:', error)
          }
        } else {
          // Use cached context
          console.log(`[AI] Using cached document context (${conversationContext.totalTokens.toLocaleString()} tokens)`)
          systemPrompt = conversationContext.systemPrompt || systemPrompt
        }
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
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat-completion'
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
