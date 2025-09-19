/**
 * Google GenAI SDK Client Wrapper
 * Provides stateful chat sessions with conversation memory
 * Compatible with existing model selection and streaming patterns
 * Now with database persistence to survive server restarts
 */

import { GoogleGenAI } from '@google/genai'
import type { GeminiModelKey } from './ai-config'
import { GeminiModelSelector } from './ai-config'
import { saveSession, loadSession, findSessionByConversation, updateSessionActivity } from './session-store'

// Environment validation
function validateGeminiConfig(): { isValid: boolean; error?: string } {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

  if (!apiKey) {
    return {
      isValid: false,
      error: 'Google Generative AI API key is missing. Set GOOGLE_GENERATIVE_AI_API_KEY in your .env.local.'
    }
  }

  if (!apiKey.startsWith('AIza')) {
    return {
      isValid: false,
      error: 'GOOGLE_GENERATIVE_AI_API_KEY appears to be invalid. It should start with "AIza".'
    }
  }

  return { isValid: true }
}

// Initialize Google GenAI client
let genaiClient: GoogleGenAI | null = null

function getGenAIClient(): GoogleGenAI {
  if (!genaiClient) {
    const validation = validateGeminiConfig()
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    genaiClient = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!
    })
  }

  return genaiClient
}

// Map our model keys to Google GenAI model names
function mapModelKeyToGenAIModel(modelKey: GeminiModelKey): string {
  const modelConfig = GeminiModelSelector.getModelConfig(modelKey)
  return modelConfig.name
}

// Stateful chat session interface
export interface StatefulChatSession {
  id: string
  conversationId: string
  documentContext?: string
  systemPrompt: string
  history: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
  modelKey: GeminiModelKey
  createdAt: Date
  lastActivityAt: Date
}

// Session storage (in-memory for now, can be moved to Redis later)
const activeSessions = new Map<string, StatefulChatSession>()

// Session cleanup (remove inactive sessions after 1 hour)
const SESSION_TTL = 60 * 60 * 1000 // 1 hour
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastActivityAt.getTime() > SESSION_TTL) {
      activeSessions.delete(sessionId)
      console.log(`[GenAI] Cleaned up inactive session: ${sessionId}`)
    }
  }
}, 15 * 60 * 1000) // Clean every 15 minutes

export interface CreateChatOptions {
  conversationId: string
  modelKey?: GeminiModelKey
  systemPrompt: string
  documentContext?: string
  history?: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
}

export interface SendMessageOptions {
  message: string
  sessionId: string
}

export interface StreamChunk {
  text: string
  isComplete?: boolean
  usage?: {
    totalTokens?: number
    promptTokens?: number
    completionTokens?: number
  }
}

/**
 * Create a new stateful chat session with database persistence
 */
export async function createStatefulChat(options: CreateChatOptions): Promise<string> {
  try {
    // First check if session already exists in database
    const existingSession = await findSessionByConversation(options.conversationId)

    if (existingSession) {
      console.log(`[GenAI] Found existing session in database: ${existingSession.id}`)

      // Restore session to memory
      const session: StatefulChatSession = {
        id: existingSession.id,
        conversationId: existingSession.conversation_id,
        documentContext: existingSession.document_context,
        systemPrompt: existingSession.system_prompt,
        history: existingSession.conversation_history,
        modelKey: existingSession.model_key,
        createdAt: new Date(existingSession.created_at),
        lastActivityAt: new Date()
      }

      activeSessions.set(existingSession.id, session)

      // Update activity in database
      await updateSessionActivity(existingSession.id)

      return existingSession.id
    }

    const client = getGenAIClient()
    const modelKey = options.modelKey || 'FLASH'
    const modelName = mapModelKeyToGenAIModel(modelKey)

    console.log(`[GenAI] Creating new stateful chat with model: ${modelName}`)

    // Generate session ID
    const sessionId = crypto.randomUUID()

    // Create session object
    const session: StatefulChatSession = {
      id: sessionId,
      conversationId: options.conversationId,
      documentContext: options.documentContext,
      systemPrompt: options.systemPrompt,
      history: options.history || [],
      modelKey,
      createdAt: new Date(),
      lastActivityAt: new Date()
    }

    // Store in memory first
    activeSessions.set(sessionId, session)

    // Save to database for persistence
    const saved = await saveSession({
      id: sessionId,
      conversationId: options.conversationId,
      modelKey,
      systemPrompt: options.systemPrompt,
      documentContext: options.documentContext,
      history: options.history || []
    })

    if (!saved) {
      console.warn(`[GenAI] Failed to save session to database: ${sessionId}`)
      // Continue anyway - session will work in memory
    }

    console.log(`[GenAI] Created stateful session: ${sessionId} for conversation: ${options.conversationId}`)

    return sessionId
  } catch (error) {
    console.error('[GenAI] Failed to create stateful chat:', error)
    throw error
  }
}

/**
 * Send message to existing stateful session with streaming
 */
export async function* sendStatefulMessage(options: SendMessageOptions): AsyncGenerator<StreamChunk> {
  let session = activeSessions.get(options.sessionId)

  // If session not in memory, try to load from database
  if (!session) {
    console.log(`[GenAI] Session ${options.sessionId} not in memory, loading from database`)
    const persistedSession = await loadSession(options.sessionId)

    if (!persistedSession) {
      throw new Error(`Session not found: ${options.sessionId}`)
    }

    // Restore session to memory
    session = {
      id: persistedSession.id,
      conversationId: persistedSession.conversation_id,
      documentContext: persistedSession.document_context,
      systemPrompt: persistedSession.system_prompt,
      history: persistedSession.conversation_history,
      modelKey: persistedSession.model_key,
      createdAt: new Date(persistedSession.created_at),
      lastActivityAt: new Date()
    }

    activeSessions.set(options.sessionId, session)
    console.log(`[GenAI] Restored session from database: ${options.sessionId}`)
  }

  try {
    const client = getGenAIClient()
    const modelName = mapModelKeyToGenAIModel(session.modelKey)

    // Update last activity
    session.lastActivityAt = new Date()

    console.log(`[GenAI] Sending message to session: ${options.sessionId}`)

    // Prepare conversation context
    const contents = []

    // Add system prompt as first message if exists
    if (session.systemPrompt) {
      contents.push({
        role: 'user' as const,
        parts: [{ text: session.systemPrompt }]
      })
      contents.push({
        role: 'model' as const,
        parts: [{ text: 'I understand. I\'m ready to help you according to these instructions.' }]
      })
    }

    // Add conversation history
    contents.push(...session.history)

    // Add current user message
    contents.push({
      role: 'user' as const,
      parts: [{ text: options.message }]
    })

    // Stream response
    const response = await client.models.generateContentStream({
      model: modelName,
      contents,
      config: {
        maxOutputTokens: 4000,
        temperature: 0.7
      }
    })

    let accumulatedText = ''

    for await (const chunk of response) {
      const chunkText = chunk.text || ''
      accumulatedText += chunkText

      yield {
        text: chunkText,
        isComplete: false
      }
    }

    // Add conversation to history
    session.history.push({
      role: 'user',
      parts: [{ text: options.message }]
    })
    session.history.push({
      role: 'model',
      parts: [{ text: accumulatedText }]
    })

    // Save updated session to database
    await saveSession({
      id: session.id,
      conversationId: session.conversationId,
      modelKey: session.modelKey,
      systemPrompt: session.systemPrompt,
      documentContext: session.documentContext,
      history: session.history
    })

    // Final chunk with completion signal
    yield {
      text: '',
      isComplete: true,
      usage: {
        totalTokens: Math.ceil(accumulatedText.length / 4), // Rough estimate
        promptTokens: undefined,
        completionTokens: undefined
      }
    }

    console.log(`[GenAI] Message sent successfully to session: ${options.sessionId}`)

  } catch (error) {
    console.error(`[GenAI] Failed to send message to session ${options.sessionId}:`, error)
    throw error
  }
}

/**
 * Get session information
 */
export function getSessionInfo(sessionId: string): StatefulChatSession | null {
  return activeSessions.get(sessionId) || null
}

/**
 * Get chat history from session
 */
export async function getSessionHistory(sessionId: string): Promise<any[] | null> {
  const session = activeSessions.get(sessionId)

  if (!session) {
    return null
  }

  try {
    return session.history
  } catch (error) {
    console.error(`[GenAI] Failed to get history for session ${sessionId}:`, error)
    return null
  }
}

/**
 * Close and cleanup session
 */
export function closeSession(sessionId: string): boolean {
  const session = activeSessions.get(sessionId)

  if (session) {
    activeSessions.delete(sessionId)
    console.log(`[GenAI] Closed session: ${sessionId}`)
    return true
  }

  return false
}

/**
 * Get active session statistics
 */
export function getSessionStats() {
  const now = Date.now()
  let activeCount = 0
  let oldestSession = now

  for (const session of activeSessions.values()) {
    const lastActivity = session.lastActivityAt.getTime()
    if (now - lastActivity < SESSION_TTL) {
      activeCount++
      oldestSession = Math.min(oldestSession, session.createdAt.getTime())
    }
  }

  return {
    totalSessions: activeSessions.size,
    activeSessions: activeCount,
    oldestSessionAge: oldestSession < now ? Math.floor((now - oldestSession) / 1000) : 0
  }
}

/**
 * Validate Google GenAI configuration
 */
export { validateGeminiConfig }