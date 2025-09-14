"use client"

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { GeminiModelKey } from './ai-config'

export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: Record<string, unknown>
  citations?: Citation[]
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

  // actions
  loadConversation: (conversationId: string, documentId?: string) => Promise<void>
  sendMessage: (content: string, documentId?: string | null, model?: GeminiModelKey) => Promise<void>

  regenerateLastMessage: () => Promise<void>
  setDocumentContext: (ctx: DocumentContext | null) => void
  setStreamingMessage: (val: string) => void
  setError: (err: string | null) => void
  setSelectedModel: (model: GeminiModelKey) => void
  createNewConversation: (documentId?: string) => Promise<string>
  resetState: () => void
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
        metadata: msg.metadata
      }))

      setMessages(loadedMessages)
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

  // AI SDK v3 DataStream response parser
  async function streamFromApi(payload: unknown): Promise<{text: string, metadata?: unknown}> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`API error: ${res.status} - ${errorText}`)
    }

    if (!res.body) {
      const text = await res.text()
      return { text }
    }

    let accumulatedText = ''
    let finalMetadata: unknown = null

    try {
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })

        // Parse AI SDK v3 DataStream format
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            if (line.startsWith('0:')) {
              // Text content line in AI SDK v3 format
              const content = JSON.parse(line.slice(2))
              if (typeof content === 'string') {
                accumulatedText += content
                setStreamingMessage(accumulatedText)
              }
            } else if (line.startsWith('2:')) {
              // Data/metadata line
              const metadata = JSON.parse(line.slice(2))
              if (metadata) {
                finalMetadata = metadata
              }
            } else if (line.startsWith('d:')) {
              // Delta line - parse JSON
              const data = line.slice(2)
              const parsed = JSON.parse(data)
              if (parsed?.text) {
                accumulatedText += parsed.text
                setStreamingMessage(accumulatedText)
              }
            }
          } catch (parseError) {
            // Continue if parsing fails - this is normal for some stream chunks
            continue
          }
        }
      }

      return { text: accumulatedText, metadata: finalMetadata }

    } catch (error) {
      console.error('[Chat] Stream reading error:', error)
      throw error
    }
  }

  const sendMessage = useCallback(async (content: string, documentId?: string | null, model?: GeminiModelKey) => {
    const modelToUse = model || selectedModel
    const id = `u_${Date.now()}`
    const user: Message = { id, role: 'user', content, timestamp: new Date() }

    // Instantly show user message (optimistic UI)
    setMessages(prev => [...prev, user])

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

      const payload = {
        messages: [...allMessagesRef.current, user].map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        })),
        chatType: documentId ? 'document' : 'general',
        documentId: documentId || documentContext?.id,
        conversationId: convId,
        preferredModel: modelToUse
      }

      console.log(`[Chat] Sending message with model ${modelToUse}...`)
      const startTime = Date.now()

      // Ultra-smooth streaming: consistent pace like ChatGPT/T3.chat
      let serverBuffer = '' // Buffer for chunks from server
      let displayedText = '' // Text currently shown to user
      let isStreamingActive = true

      const res = await fetch('/api/chat', {
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
        setMessages(prev => prev.map(msg =>
          msg.id === assistantId
            ? {
                ...msg,
                content: serverBuffer,
                isStreaming: false,
                metadata: {
                  model: modelConfig.displayName,
                  modelKey: modelToUse,
                  duration
                }
              }
            : msg
        ))
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

      // Remove both optimistically added user message and assistant placeholder on error
      setMessages(prev => prev.slice(0, -2))
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }, [documentContext, selectedModel])



  const regenerateLastMessage = useCallback(async () => {
    // Find last assistant and user message indices (compatible with older TypeScript)
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
      // Remove the last assistant message and regenerate
      const newMessages = messages.slice(0, lastAssistantIndex)
      setMessages(newMessages)

      const lastUserMessage = messages[lastUserIndex]
      await sendMessage(lastUserMessage.content, documentContext?.id, selectedModel)
    }
  }, [messages, sendMessage, documentContext, selectedModel])

  const createNewConversation = useCallback(async (documentId?: string) => {
    return await createNewConversationInternal(documentId)
  }, [])

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
          title: null // Will be set when first message is sent
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

  const resetState = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
    setError(null)
    setCurrentConversation(null)
    conversationRef.current = null
  }, [])

  return {
    messages,
    isLoading,
    streamingMessage,
    error,
    documentContext,
    currentConversation,
    selectedModel,
    loadConversation,
    sendMessage,

    regenerateLastMessage,
    setDocumentContext,
    setStreamingMessage,
    setError,
    setSelectedModel,
    createNewConversation,
    resetState
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
