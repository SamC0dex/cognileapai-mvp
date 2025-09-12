'use client'

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { StreamingIndicator } from './streaming-indicator'
import { useChatStore, getSuggestedQuestions } from '@/lib/chat-store'
import type { Citation } from './types'

// Check if we're in demo mode (Supabase not configured)
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const LoadingSkeleton: React.FC = React.memo(() => (
  <div className="space-y-4 p-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex justify-start">
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="w-8 h-8 bg-muted rounded-full loading-shimmer" />
          <div className="space-y-2">
            <div className="w-64 h-4 bg-muted rounded loading-shimmer" />
            <div className="w-48 h-4 bg-muted rounded loading-shimmer" />
            <div className="w-32 h-4 bg-muted rounded loading-shimmer" />
          </div>
        </div>
      </div>
    ))}
  </div>
))

LoadingSkeleton.displayName = 'LoadingSkeleton'

const EmptyState: React.FC<{
  suggestedQuestions: string[]
  onQuestionClick: (question: string) => void
}> = React.memo(({ suggestedQuestions, onQuestionClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-12 px-4"
  >
    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>
    
    <h3 className="text-xl font-semibold text-foreground mb-3">Start a conversation about your document</h3>
    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
      Ask questions, request summaries, or get detailed explanations about any part of the document.
    </p>
    
    {/* Suggested Questions */}
    {suggestedQuestions.length > 0 && (
      <div className="space-y-3 max-w-lg mx-auto">
        <p className="text-sm font-medium text-foreground mb-4">Try asking:</p>
        {suggestedQuestions.map((question, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 + 0.3 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onQuestionClick(question)}
            className="w-full p-4 text-left bg-muted/50 hover:bg-muted rounded-xl border border-border hover:border-primary/20 transition-all duration-200 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {question}
              </span>
              <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </motion.button>
        ))}
      </div>
    )}
  </motion.div>
))

EmptyState.displayName = 'EmptyState'

const ErrorBoundary: React.FC<{ 
  children: React.ReactNode
  onRetry?: () => void 
}> = ({ children, onRetry }) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const handleError = () => setHasError(true)
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  if (hasError) {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.865-.833-2.635 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">Something went wrong</h3>
        <p className="text-sm text-muted-foreground mb-4">
          There was an error loading the chat. Please try again.
        </p>
        {onRetry && (
          <button
            onClick={() => {
              setHasError(false)
              onRetry()
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [userScrolled, setUserScrolled] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(false)

  // Load conversation when document/conversation changes
  useEffect(() => {
    if (documentId && conversationId) {
      loadConversation(conversationId, documentId)
    } else if (documentId) {
      // Set document context for new conversations
      // This could be expanded to fetch document details
      setDocumentContext({
        id: documentId,
        title: 'Document', // This should come from document data
        sections: []
      })
    }
  }, [documentId, conversationId, loadConversation, setDocumentContext])

  // Smart auto-scroll: only scroll if user hasn't manually scrolled up
  const scrollToBottom = useCallback((smooth = true, force = false) => {
    if (messagesEndRef.current && (force || !userScrolled)) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
      setUserScrolled(false)
    }
  }, [userScrolled])

  // Detect user scrolling
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    
    setUserScrolled(!isNearBottom)
    setShowScrollButton(!isNearBottom && messages.length > 3)
  }, [messages.length])

  // Auto-scroll on new messages (respecting user scroll state)
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 100)
    return () => clearTimeout(timer)
  }, [messages, scrollToBottom])

  // Auto-scroll when streaming message updates
  useEffect(() => {
    if (streamingMessage && !userScrolled) {
      scrollToBottom(false)
    }
  }, [streamingMessage, userScrolled, scrollToBottom])

  // Check if the last message is streaming
  const lastMessage = messages[messages.length - 1]
  const showStreamingIndicator = useMemo(() => {
    return Boolean(
      streamingMessage || 
      (lastMessage?.isStreaming && lastMessage.role === 'assistant')
    )
  }, [streamingMessage, lastMessage])

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
    <ErrorBoundary onRetry={handleRetry}>
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
        
        {/* Chat Header with Clear Button */}
        {messages.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClearChat}
                className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/20 rounded-md transition-colors"
              >
                Clear Chat
              </motion.button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-thin"
          style={{ minHeight: 0 }} // Important for flexbox scrolling
        >
          {/* Loading State */}
          {isLoading && <LoadingSkeleton />}

          {/* Error State */}
          {error && (
            <div className="p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-red-100 dark:bg-red-800 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.865-.833-2.635 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && messages.length === 0 && (
            <EmptyState
              suggestedQuestions={suggestedQuestions}
              onQuestionClick={handleSuggestedQuestionClick}
            />
          )}

          {/* Messages */}
          {!isLoading && messages.length > 0 && (
            <div className="p-4 space-y-1">
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onCitationClick={handleCitationClick}
                    showAvatar={true}
                    showTimestamp={true}
                  />
                ))}
              </AnimatePresence>

              {/* Show current streaming content */}
              {streamingMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="group relative">
                    <div className="text-xs text-muted-foreground mb-1 ml-4">AI</div>
                    <div className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-sm text-[15px] leading-relaxed bg-muted text-foreground border border-border">
                      {streamingMessage}
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="inline-block w-2 h-5 bg-primary ml-1"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Streaming Indicator */}
              <StreamingIndicator 
                isVisible={showStreamingIndicator && !streamingMessage}
                text="AI is thinking..."
              />
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-20 right-4 z-10"
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => scrollToBottom(true, true)}
                className="w-10 h-10 bg-background border border-border shadow-lg rounded-full flex items-center justify-center hover:bg-muted transition-colors"
              >
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={showStreamingIndicator}
          placeholder="Ask about concepts, request summaries, or get explanations..."
          maxLength={4000}
          autoFocus={false}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
        />
      </div>
    </ErrorBoundary>
  )
})

ChatContainer.displayName = 'ChatContainer'
