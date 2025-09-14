import { NextRequest } from 'next/server'
import { streamText, convertToCoreMessages } from 'ai'
import { GeminiModelSelector, validateGeminiConfig, type MessageContext } from '@/lib/ai-config'
import type { GeminiModelKey } from '@/lib/ai-config'
import { createClient } from '@supabase/supabase-js'

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

    // Add system prompt based on chat type and context
    const systemPrompt = getSystemPrompt(chatType, documentId, selectedModelKey)

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
              }
            })
          } catch (error) {
            console.error('[DB] Failed to save messages:', error)
          }
        }
      }
    })

    return result.toDataStreamResponse()

  } catch (error) {
    console.error('[API] Chat error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
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
        metadata
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
