"use client"

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { GeminiModelKey } from './ai-config'
import { TokenManager, type ConversationTokens } from './token-manager'

export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: Record<string, unknown>
  citations?: Citation[]
  tokenCount?: {
    estimated: number
    confidence: 'high' | 'medium' | 'low'
  }
}

export interface Citation {
  id: string
  text: string
  page?: number
  section?: string
}

export interface DocumentContext {
  id: string
  title: string
  sections: Array<{ id?: string; title?: string }>
}

export interface Conversation {
  id: string
  title: string
  documentId?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface StoreShape {
  // state
  messages: Message[]
  isLoading: boolean
  streamingMessage: string
  error: string | null
  documentContext: DocumentContext | null
  currentConversation: string | null
  selectedModel: GeminiModelKey

  // token tracking
  conversationTokens: ConversationTokens | null
  contextWarning: string | null

  // actions
  loadConversation: (conversationId: string, documentId?: string) => Promise<void>
  sendMessage: (content: string, documentId?: string | null, model?: GeminiModelKey, selectedDocuments?: Array<{id: string, title: string}>, skipUserMessage?: boolean) => Promise<void>

  regenerateLastMessage: (modelOverride?: GeminiModelKey, selectedDocuments?: Array<{id: string, title: string}>) => Promise<void>
  setDocumentContext: (ctx: DocumentContext | null) => void
  setStreamingMessage: (val: string) => void
  setError: (err: string | null) => void
  setSelectedModel: (model: GeminiModelKey) => void
  createNewConversation: (documentId?: string) => Promise<string>
  resetState: () => void

  // token tracking actions
  updateTokenTracking: () => void
  canAddMessage: (content: string) => { canAdd: boolean; warning?: string }
}


// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Enhanced chat store with Supabase integration
export function useChatStore(): StoreShape {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null)
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<GeminiModelKey>('FLASH')

  // token tracking state
  const [conversationTokens, setConversationTokens] = useState<ConversationTokens | null>(null)
  const [contextWarning, setContextWarning] = useState<string | null>(null)

  const conversationRef = useRef<string | null>(null)
  const allMessagesRef = useRef<Message[]>([])
  allMessagesRef.current = messages

  const loadConversation = useCallback(async (conversationId: string, documentId?: string) => {
    try {
      setIsLoading(true)
      setError(null)
      setCurrentConversation(conversationId)
      conversationRef.current = conversationId

      // Load messages from Supabase
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true })

      if (messagesError) {
        console.error('Error loading messages:', {
          error: messagesError,
          message: messagesError.message,
          details: messagesError.details,
          code: messagesError.code,
          conversationId
        })
        setError(`Failed to load conversation: ${messagesError.message || 'Unknown database error'}`)
        return
      }

      // Handle empty messages case
      if (!messagesData || messagesData.length === 0) {
        console.log(`[Chat] No messages found for conversation ${conversationId}`)
        setMessages([])
        return
      }

      // Convert to Message format
      const loadedMessages: Message[] = messagesData.map(msg => ({
        id: msg.id,
        role: msg.role as Role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        metadata: msg.metadata,
        citations: msg.citations || []
      }))

      setMessages(loadedMessages)

      // Update token tracking after loading messages
      setTimeout(() => updateTokenTracking(), 0)
      console.log(`[Chat] Loaded ${loadedMessages.length} messages for conversation ${conversationId}`)

      // Load document context if documentId provided and not already loaded
      if (documentId && documentContext?.id !== documentId) {
        const { data: docData, error: docError } = await supabase
          .from('documents')
          .select('id, title')
          .eq('id', documentId)
          .single()

        if (docError) {
          console.warn('[Chat] Failed to load document context:', docError.message)
        } else if (docData) {
          setDocumentContext({ id: docData.id, title: docData.title, sections: [] })
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Error in loadConversation:', error)
      setError(`Failed to load conversation: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }, [documentContext])


  const sendMessage = useCallback(async (content: string, documentId?: string | null, model?: GeminiModelKey, selectedDocuments?: Array<{id: string, title: string}>, skipUserMessage?: boolean) => {
    const modelToUse = model || selectedModel
    let user: Message | null = null

    // Add user message unless this is a regeneration
    if (!skipUserMessage) {
      const id = `u_${Date.now()}`
      const tokenCount = TokenManager.estimate(content)
      user = {
        id,
        role: 'user',
        content,
        timestamp: new Date(),
        tokenCount: {
          estimated: tokenCount.estimated,
          confidence: tokenCount.confidence
        }
      }
      // Instantly show user message (optimistic UI)
      setMessages(prev => [...prev, user!])

      // Update token tracking immediately after adding user message
      setTimeout(() => updateTokenTracking(), 0)
    }

    // Immediately add assistant placeholder for streaming
    const assistantId = `a_${Date.now()}`
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    }
    setMessages(prev => [...prev, assistantPlaceholder])

    // Update token tracking immediately after adding assistant placeholder
    setTimeout(() => updateTokenTracking(), 0)

    setIsLoading(false) // No loading state needed with optimistic UI
    setStreamingMessage('')
    setError(null)

    try {
      // Create conversation if needed
      let convId = conversationRef.current
      if (!convId) {
        console.log('[Chat] Creating new conversation...')
        convId = await createNewConversationInternal(documentId || documentContext?.id)
      }

      // For regeneration, ensure we send messages up to and including the user message
      // For new messages, use allMessagesRef which is more current
      let messagesToSend: Array<{id: string, role: string, content: string, timestamp: string}>

      if (skipUserMessage) {
        // During regeneration: use current messages, ensuring the last one is the user message we're regenerating from
        // allMessagesRef.current should already contain the user message we want to regenerate from
        messagesToSend = allMessagesRef.current.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }))

        // Ensure the last message is a user message (required by API)
        if (messagesToSend.length === 0 || messagesToSend[messagesToSend.length - 1].role !== 'user') {
          throw new Error('Cannot regenerate: no user message found to regenerate from')
        }
      } else {
        // Normal message: use current messages + new user message
        messagesToSend = [...allMessagesRef.current, ...(user ? [user] : [])].map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        }))
      }

      const payload = {
        messages: messagesToSend,
        chatType: (documentId || selectedDocuments?.length) ? 'document' : 'general',
        documentId: documentId || documentContext?.id,
        selectedDocuments: selectedDocuments,
        conversationId: convId,
        preferredModel: modelToUse
      }

      console.log(`[Chat] Sending message with model ${modelToUse}...`)
      const startTime = Date.now()

      // Ultra-smooth streaming: consistent pace like ChatGPT/T3.chat
      let serverBuffer = '' // Buffer for chunks from server
      let displayedText = '' // Text currently shown to user
      let isStreamingActive = true

      // 🚀 ROUTE TO STATEFUL CHAT ENDPOINT
      const apiEndpoint = '/api/chat/stateful'
      console.log(`[Chat] Using STATEFUL chat endpoint`)

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      if (!res.body) {
        throw new Error('No response body')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      // Smooth text streaming at consistent pace
      const STREAM_SPEED = 25 // ms per character for smooth flow
      let streamInterval: NodeJS.Timeout

      const startSmoothStreaming = () => {
        streamInterval = setInterval(() => {
          if (displayedText.length < serverBuffer.length && isStreamingActive) {
            // Stream one character at a time for ultra-smooth effect
            displayedText = serverBuffer.slice(0, displayedText.length + 1)

            // Update UI with smooth transition
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: displayedText, isStreaming: true }
                : msg
            ))
          } else if (displayedText.length >= serverBuffer.length && !isStreamingActive) {
            // Streaming complete - stop interval and mark as done
            clearInterval(streamInterval)
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? { ...msg, content: displayedText, isStreaming: false }
                : msg
            ))
          }
        }, STREAM_SPEED)
      }

      // Start smooth streaming immediately
      startSmoothStreaming()

      // Collect chunks from server as fast as possible
      let finalTokenUsage: number | undefined
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          isStreamingActive = false
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            if (line.startsWith('0:')) {
              const content = JSON.parse(line.slice(2))
              if (typeof content === 'string') {
                serverBuffer += content
              }
            } else if (line.startsWith('d:')) {
              const data = line.slice(2)
              try {
                const parsed = JSON.parse(data)
                if (parsed?.text) {
                  serverBuffer += parsed.text
                }
              } catch {
                if (data) {
                  serverBuffer += data
                }
              }
            } else if (line.startsWith('8:')) {
              // Handle completion metadata (usage tokens)
              try {
                const metadata = JSON.parse(line.slice(2))
                if (metadata?.usage?.totalTokens) {
                  finalTokenUsage = metadata.usage.totalTokens
                  console.log('[Chat] Received token usage:', finalTokenUsage)
                }
              } catch (parseError) {
                // Continue if metadata parsing fails
              }
            }
          } catch (parseError) {
            continue
          }
        }
      }

      // Ensure smooth streaming completes
      const waitForCompletion = setInterval(() => {
        if (displayedText.length >= serverBuffer.length) {
          clearInterval(waitForCompletion)
          clearInterval(streamInterval)
        }
      }, 100)

      const duration = Date.now() - startTime
      console.log(`[Chat] Streaming completed in ${duration}ms`)

      if (!serverBuffer || serverBuffer.trim() === '') {
        throw new Error('AI response was empty')
      }

      // Get model display name from ai-config
      const { GeminiModelSelector } = await import('./ai-config')
      const modelConfig = GeminiModelSelector.getModelConfig(modelToUse)

      // Final update with metadata (will be handled by the interval completion)
      const finalUpdate = () => {
        const assistantTokenCount = TokenManager.estimate(serverBuffer)
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                content: serverBuffer,
                isStreaming: false,
                tokenCount: {
                  estimated: assistantTokenCount.estimated,
                  confidence: assistantTokenCount.confidence
                },
                metadata: {
                  model: modelConfig.displayName,
                  modelKey: modelToUse,
                  duration,
                  tokens: finalTokenUsage || assistantTokenCount.estimated // Use API tokens if available
                }
              }
            : msg
        ))

        // Update token tracking after message is complete
        updateTokenTracking()
      }

      // Wait a bit for smooth streaming to complete, then add metadata
      setTimeout(finalUpdate, 500)

      // Update chat history (debounced to avoid too frequent updates)
      if (typeof window !== 'undefined') {
        try {
          const { upsertThread, touchThread } = await import('./chat-history')
          const preview = serverBuffer.slice(0, 100) + (serverBuffer.length > 100 ? '...' : '')

          if (allMessagesRef.current.length === 0) {
            // New conversation
            await upsertThread({
              id: convId,
              title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
              documentId: documentId || documentContext?.id,
              preview,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              messagesCount: 2
            })
          } else {
            // Update existing
            await touchThread(convId, {
              preview,
              messagesCount: allMessagesRef.current.length + 2
            })
          }
        } catch (historyError) {
          console.warn('[Chat] Failed to update chat history:', historyError)
          // Don't fail the whole operation for history update errors
        }
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred'
      console.error('[Chat] sendMessage failed:', errorMessage, e)
      setError(`Failed to send message: ${errorMessage}`)

      // Remove optimistically added messages on error
      // For regeneration (no user message added): remove 1 message (assistant placeholder)
      // For normal messages: remove 2 messages (user + assistant placeholder)
      setMessages(prev => prev.slice(0, skipUserMessage ? -1 : -2))
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }, [documentContext, selectedModel])

  // Define createNewConversationInternal before it's used in callbacks
  const createNewConversationInternal = async (documentId?: string): Promise<string> => {
    try {
      // Generate a proper UUID v4
      const conversationId = crypto.randomUUID()

      // Create conversation in database
      const { error } = await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          document_id: documentId || null,
          selected_document_id: documentId || null,
          title: 'New Conversation' // Temporary title, will be updated with first message
        })

      if (error) {
        console.warn('[DB] Failed to create conversation in database, continuing with in-memory:', error.message)
        // Continue with in-memory conversation even if database insert fails
      } else {
        console.log('[Chat] Created conversation in database with ID:', conversationId)
      }

      setCurrentConversation(conversationId)
      conversationRef.current = conversationId
      return conversationId
    } catch (error) {
      console.error('Error in createNewConversationInternal:', error)
      const fallbackId = crypto.randomUUID()
      setCurrentConversation(fallbackId)
      conversationRef.current = fallbackId
      return fallbackId
    }
  }

  const regenerateLastMessage = useCallback(async (modelOverride?: GeminiModelKey, selectedDocuments?: Array<{id: string, title: string}>) => {
    // Find last assistant and user message indices
    let lastAssistantIndex = -1
    let lastUserIndex = -1

    for (let i = messages.length - 1; i >= 0; i--) {
      if (lastAssistantIndex === -1 && messages[i].role === 'assistant') {
        lastAssistantIndex = i
      }
      if (lastUserIndex === -1 && messages[i].role === 'user') {
        lastUserIndex = i
      }
      if (lastAssistantIndex > -1 && lastUserIndex > -1) break
    }

    if (lastAssistantIndex > -1 && lastUserIndex > -1 && lastUserIndex < lastAssistantIndex) {
      // Get the messages up to (and including) the user message we want to regenerate from
      const messagesForRegeneration = messages.slice(0, lastAssistantIndex)
      const lastUserMessage = messages[lastUserIndex]

      // Remove the last assistant message from UI
      setMessages(messagesForRegeneration)

      // Update allMessagesRef to ensure sendMessage has the correct message context
      allMessagesRef.current = messagesForRegeneration

      // Use the existing sendMessage with skipUserMessage=true to reuse proven streaming logic
      // Preserve the selectedDocuments that were used in the original conversation
      await sendMessage(lastUserMessage.content, documentContext?.id, modelOverride, selectedDocuments, true)
    }
  }, [messages, documentContext, sendMessage])

  const createNewConversation = useCallback(async (documentId?: string) => {
    return await createNewConversationInternal(documentId)
  }, [])

  const resetState = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
    setError(null)
    setCurrentConversation(null)
    conversationRef.current = null

    // Reset token tracking
    setConversationTokens(null)
    setContextWarning(null)
  }, [])

  const stableSetDocumentContext = useCallback((ctx: DocumentContext | null) => {
    setDocumentContext(ctx)
  }, [])

  // Token tracking functions
  const updateTokenTracking = useCallback(() => {
    if (messages.length === 0) {
      setConversationTokens(null)
      setContextWarning(null)
      return
    }

    // Convert messages to format expected by TokenManager
    const messagesWithTokens = messages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.timestamp,
      tokenCount: msg.metadata?.tokens && typeof msg.metadata.tokens === 'number' ? {
        estimated: msg.metadata.tokens,
        confidence: 'high' as const,
        method: 'api_count' as const,
        timestamp: new Date()
      } : msg.tokenCount ? {
        estimated: msg.tokenCount.estimated,
        confidence: msg.tokenCount.confidence,
        method: 'estimation' as const,
        timestamp: new Date()
      } : TokenManager.estimate(msg.content)
    }))

    // Calculate conversation tokens
    const tokens = TokenManager.estimateConversation(messagesWithTokens)
    tokens.conversationId = currentConversation || 'temp-conversation'

    // Generate warning message
    const warning = TokenManager.getWarning(tokens)

    setConversationTokens(tokens)
    setContextWarning(warning)

    console.log(`[TokenTracker] Conversation ${currentConversation}: ${tokens.totalTokens.toLocaleString()} tokens (${tokens.warningLevel})`)
  }, [messages, currentConversation])

  const canAddMessage = useCallback((content: string): { canAdd: boolean; warning?: string } => {
    if (!conversationTokens) {
      return { canAdd: true }
    }

    const newMessageTokens = TokenManager.estimate(content).estimated
    const result = TokenManager.canAdd(conversationTokens.totalTokens, newMessageTokens)

    return {
      canAdd: result.canAdd,
      warning: result.suggestedAction
    }
  }, [conversationTokens])

  return {
    messages,
    isLoading,
    streamingMessage,
    error,
    documentContext,
    currentConversation,
    selectedModel,

    // token tracking
    conversationTokens,
    contextWarning,

    loadConversation,
    sendMessage,

    regenerateLastMessage,
    setDocumentContext: stableSetDocumentContext,
    setStreamingMessage,
    setError,
    setSelectedModel,
    createNewConversation,
    resetState,

    // token tracking actions
    updateTokenTracking,
    canAddMessage
  }
}

export function getSuggestedQuestions(ctx: DocumentContext | null | undefined): string[] {
  if (!ctx) {
    return [
      'How can you help me learn today?',
      'Suggest a quick study plan.',
      'What should I focus on first?'
    ]
  }
  return [
    'Give me key concepts from this document.',
    'Create a short study guide.',
    'Generate practice questions.'
  ]
}

export async function createNewConversation(documentId: string): Promise<string> {
  return crypto.randomUUID()
}
