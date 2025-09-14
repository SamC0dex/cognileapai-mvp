'use client'

import { useCallback, useEffect } from 'react'
import { useChatStore, createNewConversation, getSuggestedQuestions } from './chat-store'

/**
 * Custom hook for chat functionality
 * Provides a simplified API for components to interact with the chat store
 */
export function useChat(documentId?: string, conversationId?: string) {
  const store = useChatStore()

  // Initialize conversation when documentId or conversationId changes
  useEffect(() => {
    if (conversationId) {
      // Load existing conversation (with optional documentId)
      store.loadConversation(conversationId, documentId)
    } else if (documentId) {
      // Set up new conversation context for document-specific chat
      store.setDocumentContext({
        id: documentId,
        title: 'Document', // This should be fetched from document data
        sections: []
      })
    }
    // If neither conversationId nor documentId, this is a new general chat (no initialization needed)
  }, [documentId, conversationId, store.loadConversation, store.setDocumentContext])

  // Send message with simplified API
  const sendMessage = useCallback(async (content: string, modelOverride?: import('./ai-config').GeminiModelKey) => {
    if (!content.trim()) return

    try {
      await store.sendMessage(content.trim(), documentId, modelOverride)
      store.setError(null)
    } catch (error) {
      console.error('Failed to send message:', error)
      store.setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }, [store, documentId])



  // Regenerate last message with optional model override
  const regenerateLastMessage = useCallback(async (modelOverride?: import('./ai-config').GeminiModelKey) => {
    try {
      await store.regenerateLastMessage(modelOverride)
      store.setError(null)
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      store.setError(error instanceof Error ? error.message : 'Failed to regenerate message')
    }
  }, [store])

  // Create new conversation
  const createConversation = useCallback(async () => {
    if (!documentId) return null
    
    return await createNewConversation(documentId)
  }, [documentId])

  // Get suggested questions
  const suggestedQuestions = getSuggestedQuestions(store.documentContext)

  // Computed values
  const isStreaming = Boolean(store.streamingMessage)
  const hasMessages = store.messages.length > 0
  const lastMessage = store.messages[store.messages.length - 1]
  const isLastMessageFromUser = lastMessage?.role === 'user'
  const canRegenerateLastMessage = hasMessages && !isLastMessageFromUser && !isStreaming

  return {
    // State
    messages: store.messages,
    isLoading: store.isLoading,
    isStreaming,
    streamingMessage: store.streamingMessage,
    error: store.error,
    documentContext: store.documentContext,
    currentConversation: store.currentConversation,
    
    // Computed values
    hasMessages,
    lastMessage,
    canRegenerateLastMessage,
    suggestedQuestions,
    
    // Actions
    sendMessage,
    regenerateLastMessage,
    createConversation,
    setError: store.setError,
    resetState: store.resetState,
    
    // Advanced actions (direct store access)
    loadConversation: store.loadConversation,
    setDocumentContext: store.setDocumentContext,
    setStreamingMessage: store.setStreamingMessage
  }
}

/**
 * Hook for chat input focus management
 * Provides utilities for managing input focus across the app
 */
export function useChatInputFocus() {
  const focusInput = useCallback(() => {
    const input = document.querySelector('textarea[data-chat-input]') as HTMLTextAreaElement
    if (input) {
      input.focus()
    }
  }, [])

  const clearAndFocusInput = useCallback(() => {
    const input = document.querySelector('textarea[data-chat-input]') as HTMLTextAreaElement
    if (input) {
      // Trigger clear via custom event
      input.dispatchEvent(new CustomEvent('chat-clear'))
      input.focus()
    }
  }, [])

  return {
    focusInput,
    clearAndFocusInput
  }
}