'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { ChatInput } from './chat-input'
import { ChatMessages } from './chat-messages'
import { ChatEmptyState } from './chat-empty-state'
import { ChatHeader } from './chat-header'
import { ChatScrollButton } from './chat-scroll-button'
import { useChatStore, getSuggestedQuestions } from '@/lib/chat-store'
import type { Citation } from './types'

// Check if we're in demo mode (Supabase not configured)
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const ChatContainer: React.FC<{
  documentId?: string
  conversationId?: string
  selectedModel?: import('@/lib/ai-config').GeminiModelKey
  onModelChange?: (model: import('@/lib/ai-config').GeminiModelKey) => void
}> = React.memo(({
  documentId,
  conversationId,
  selectedModel = 'FLASH',
  onModelChange
}) => {
  // Chat store integration
  const {
    messages,
    isLoading,
    streamingMessage,
    error,
    documentContext,
    loadConversation,
    sendMessage,
    clearChat,
    regenerateLastMessage,
    setDocumentContext,
    setError
  } = useChatStore()

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [scrollTrigger, setScrollTrigger] = useState(0)

  // Load conversation when document/conversation changes
  React.useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId, documentId)
    } else if (documentId) {
      setDocumentContext({
        id: documentId,
        title: 'Document',
        sections: []
      })
    }
  }, [documentId, conversationId, loadConversation, setDocumentContext])

  // Handle scroll state changes from ChatMessages
  const handleScrollStateChange = useCallback((userScrolled: boolean, showButton: boolean) => {
    setShowScrollButton(showButton)
  }, [])

  // Force scroll to bottom
  const forceScrollToBottom = useCallback(() => {
    setScrollTrigger(prev => prev + 1)
  }, [])

  // Check if the last message is streaming
  const lastMessage = messages[messages.length - 1]
  const hasStreamingMessage = messages.some(msg => msg.role === 'assistant' && msg.isStreaming)

  // Get suggested questions based on document context
  const suggestedQuestions = useMemo(() => {
    return getSuggestedQuestions(documentContext)
  }, [documentContext])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return
    
    try {
      await sendMessage(content.trim(), documentId)
      setError(null)
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }, [sendMessage, documentId, setError])

  const handleCitationClick = useCallback((citation: Citation) => {
    // Handle citation click - could navigate to document section, show popup, etc.
    console.log('Citation clicked:', citation)
    // TODO: Implement citation click handler - maybe scroll to document section
  }, [])

  const handleSuggestedQuestionClick = useCallback((question: string) => {
    handleSendMessage(question)
  }, [handleSendMessage])

  const handleClearChat = useCallback(async () => {
    if (messages.length === 0) return
    
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to clear this conversation? This action cannot be undone.')) {
      try {
        await clearChat(documentId)
        setError(null)
      } catch (error) {
        console.error('Failed to clear chat:', error)
        setError(error instanceof Error ? error.message : 'Failed to clear chat')
      }
    }
  }, [clearChat, documentId, messages.length, setError])

  const handleRetry = useCallback(async () => {
    try {
      await regenerateLastMessage()
      setError(null)
    } catch (error) {
      console.error('Failed to regenerate message:', error)
      setError(error instanceof Error ? error.message : 'Failed to regenerate message')
    }
  }, [regenerateLastMessage, setError])

  return (
    <div className="relative h-full flex flex-col bg-background">
        {/* Demo Mode Banner */}
        {isDemoMode && (
          <div className="flex-shrink-0 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-amber-100 dark:bg-amber-800 rounded-full flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Demo Mode Active
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Chat works with mock responses. Set up Supabase & AI API for full functionality.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Header */}
        <ChatHeader
          messageCount={messages.length}
          onClearChat={handleClearChat}
        />

        {/* Messages or Empty State */}
        {messages.length === 0 && !isLoading && !error ? (
          <div className="flex-1 overflow-y-auto">
            <ChatEmptyState
              suggestedQuestions={suggestedQuestions}
              onQuestionClick={handleSuggestedQuestionClick}
            />
          </div>
        ) : (
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            error={error}
            onCitationClick={handleCitationClick}
            onScrollStateChange={handleScrollStateChange}
            forceScrollToBottom={scrollTrigger}
          />
        )}

        {/* Scroll to bottom button */}
        <ChatScrollButton
          show={showScrollButton}
          onScrollToBottom={forceScrollToBottom}
        />

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={hasStreamingMessage}
          placeholder="Ask about concepts, request summaries, or get explanations..."
          maxLength={4000}
          autoFocus={false}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
    </div>
  )
})

ChatContainer.displayName = 'ChatContainer'
