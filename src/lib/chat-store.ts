"use client"

import { useCallback, useMemo, useRef, useState } from 'react'

export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: Record<string, any>
}

export interface DocumentContext {
  id: string
  title: string
  sections: Array<{ id?: string; title?: string }>
}

interface StoreShape {
  // state
  messages: Message[]
  isLoading: boolean
  streamingMessage: string
  error: string | null
  documentContext: DocumentContext | null
  currentConversation: string | null

  // actions
  loadConversation: (conversationId: string, documentId: string) => Promise<void>
  sendMessage: (content: string, documentId?: string | null) => Promise<void>
  clearChat: (documentId?: string | null) => Promise<void>
  regenerateLastMessage: () => Promise<void>
  setDocumentContext: (ctx: DocumentContext | null) => void
  setStreamingMessage: (val: string) => void
  setError: (err: string | null) => void
  resetState: () => void
}

// Very small, hook-scoped store. Sufficient because we mount one ChatContainer.
export function useChatStore(): StoreShape {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [documentContext, setDocumentContext] = useState<DocumentContext | null>(null)
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)

  const conversationRef = useRef<string | null>(null)
  const allMessagesRef = useRef<Message[]>([])
  allMessagesRef.current = messages

  const loadConversation = useCallback(async (conversationId: string, documentId: string) => {
    setCurrentConversation(conversationId)
    conversationRef.current = conversationId
    if (documentContext?.id !== documentId) {
      setDocumentContext({ id: documentId, title: 'Document', sections: [] })
    }
  }, [documentContext])

  // Tiny SSE parser for Vercel AI DataStream format (text-delta)
  async function streamFromApi(payload: any): Promise<string> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.body) {
      return await res.text()
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let done = false
    let textAccum = ''
    let buffer = ''
    
    while (!done) {
      const { value, done: d } = await reader.read()
      done = d
      if (value) {
        buffer += decoder.decode(value, { stream: true })
        // parse event-stream lines
        const lines = buffer.split(/\n/)
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const json = trimmed.replace(/^data:\s*/, '')
          try {
            const evt = JSON.parse(json)
            if (evt.type === 'text-delta' && typeof evt.delta === 'string') {
              textAccum += evt.delta
              setStreamingMessage(textAccum)
            }
          } catch {
            // fallback: treat as plain text
            if (trimmed.length > 5) {
              textAccum += trimmed.slice(5)
              setStreamingMessage(textAccum)
            }
          }
        }
      }
    }
    return textAccum
  }

  const sendMessage = useCallback(async (content: string, documentId?: string | null) => {
    const id = `u_${Date.now()}`
    const user: Message = { id, role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, user])
    setIsLoading(true)
    setStreamingMessage('')
    setError(null)

    try {
      const payload = {
        messages: [...allMessagesRef.current, user].map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp.toISOString()
        })),
        chatType: 'general',
        documentId: documentId || documentContext?.id,
        conversationId: conversationRef.current || `conv_${Date.now()}`
      }
      const text = await streamFromApi(payload)
      const ai: Message = { id: `a_${Date.now()}`, role: 'assistant', content: text, timestamp: new Date() }
      setMessages(prev => [...prev, ai])
    } catch (e: any) {
      console.error('sendMessage failed', e)
      setError(e?.message || 'Failed to send message')
    } finally {
      setIsLoading(false)
      setStreamingMessage('')
    }
  }, [documentContext])

  const clearChat = useCallback(async () => {
    setMessages([])
  }, [])

  const regenerateLastMessage = useCallback(async () => {
    const lastUser = [...allMessagesRef.current].reverse().find(m => m.role === 'user')
    if (lastUser) {
      await sendMessage(lastUser.content, documentContext?.id)
    }
  }, [sendMessage, documentContext])

  const resetState = useCallback(() => {
    setMessages([])
    setStreamingMessage('')
    setError(null)
    setCurrentConversation(null)
  }, [])

  return {
    messages,
    isLoading,
    streamingMessage,
    error,
    documentContext,
    currentConversation,
    loadConversation,
    sendMessage,
    clearChat,
    regenerateLastMessage,
    setDocumentContext,
    setStreamingMessage,
    setError,
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
  return `conv_${documentId}_${Date.now()}`
}
