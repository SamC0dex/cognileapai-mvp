'use client'

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { ChatInput } from './chat-input'
import { ChatMessages } from './chat-messages'
import { ChatEmptyState } from './chat-empty-state'
import { SelectedDocumentDisplay } from './selected-document-display'
import { ChatScrollButton } from './chat-scroll-button'
import { useChat } from '@/lib/use-chat'
import { getSuggestedQuestions } from '@/lib/chat-store'
import type { GeminiModelKey } from '@/lib/ai-config'
import type { Citation } from './types'
import { createClient } from '@supabase/supabase-js'
import { useDocuments } from '@/contexts/documents-context'
import { StudyToolsPanel, StudyToolsCanvas, useStudyToolsStore } from '@/components/study-tools'
import { motion, useReducedMotion } from 'framer-motion'

// Enhanced chat area width variants for coordinated layout
const layoutVariants = {
  // Panel collapsed, no canvas
  panelCollapsed: {
    width: 'calc(100% - 48px)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  },
  // Panel expanded, no canvas
  panelExpanded: {
    width: '50%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  },
  // Panel collapsed, with canvas
  panelCollapsedCanvas: {
    width: 'calc(100% - 48px - 40%)',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  },
  // Panel expanded, with canvas
  panelExpandedCanvas: {
    width: '30%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  }
}

// Check if we're in demo mode (Supabase not configured)
const isDemoMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const ChatContainer: React.FC<{
  documentId?: string
  conversationId?: string
  selectedModel?: GeminiModelKey
  onModelChange?: (model: GeminiModelKey) => void
}> = React.memo(({
  documentId,
  conversationId,
  selectedModel = 'FLASH',
  onModelChange
}) => {
  const { selectedDocuments, primaryDocument, removeSelectedDocument, updateDocumentStatus } = useDocuments()
  const { isPanelExpanded, isCanvasOpen } = useStudyToolsStore()
  const prefersReducedMotion = useReducedMotion()

  // Use primary selected document if no URL document is provided
  const effectiveDocumentId = documentId || primaryDocument?.id

  // Memoize the current layout state for performance
  const layoutState = useMemo(() => {
    if (isCanvasOpen) return 'withCanvas'
    if (isPanelExpanded) return 'withPanel'
    return 'full'
  }, [isCanvasOpen, isPanelExpanded])

  // Use the chat hook for all chat functionality
  const {
    messages,
    isLoading,
    error,
    documentContext,
    sendMessage,
    regenerateLastMessage,
    setError
  } = useChat(effectiveDocumentId, conversationId)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const [urlSelectedDocument, setUrlSelectedDocument] = useState<{
    id: string
    title: string
    size?: number
    processing_status?: string
  } | null>(null)

  // Handle scroll state changes from ChatMessages
  const handleScrollStateChange = useCallback((userScrolled: boolean, showButton: boolean) => {
    setShowScrollButton(showButton)
  }, [])

  // Force scroll to bottom
  const forceScrollToBottom = useCallback(() => {
    setScrollTrigger(prev => prev + 1)
  }, [])

  // Fetch document info when documentId from URL changes
  useEffect(() => {
    const fetchDocumentInfo = async () => {
      if (!documentId || isDemoMode) {
        setUrlSelectedDocument(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, title, bytes, processing_status')
          .eq('id', documentId)
          .single()

        if (error) {
          console.error('Error fetching document:', error)
          setUrlSelectedDocument(null)
        } else if (data) {
          setUrlSelectedDocument({
            id: data.id,
            title: data.title,
            size: data.bytes || undefined,
            processing_status: data.processing_status || undefined
          })
        }
      } catch (error) {
        console.error('Error fetching document:', error)
        setUrlSelectedDocument(null)
      }
    }

    fetchDocumentInfo()

    // Poll for status updates if document is processing
    const pollInterval = setInterval(() => {
      if (urlSelectedDocument?.processing_status === 'processing') {
        fetchDocumentInfo()
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(pollInterval)
  }, [documentId, isDemoMode, urlSelectedDocument?.processing_status])

  // Poll for status updates on selected documents
  useEffect(() => {
    if (isDemoMode || selectedDocuments.length === 0) return

    const pollForSelectedDocuments = async () => {
      const processingDocs = selectedDocuments.filter(doc => doc.processing_status === 'processing')
      if (processingDocs.length === 0) return

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, processing_status')
          .in('id', processingDocs.map(doc => doc.id))

        if (!error && data) {
          data.forEach(doc => {
            if (doc.processing_status !== 'processing') {
              updateDocumentStatus(doc.id, doc.processing_status)
            }
          })
        }
      } catch (error) {
        console.error('Error polling document status:', error)
      }
    }

    const pollInterval = setInterval(pollForSelectedDocuments, 2000)
    return () => clearInterval(pollInterval)
  }, [selectedDocuments, updateDocumentStatus, isDemoMode])

  // Listen for document uploads from chat input
  useEffect(() => {
    const handleDocumentUploaded = () => {
      // Refresh selected document if needed
      if (documentId) {
        // Re-fetch document info to get updated status
        window.location.reload() // Simple approach for now
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('document-uploaded', handleDocumentUploaded)
      return () => window.removeEventListener('document-uploaded', handleDocumentUploaded)
    }
  }, [documentId])

  // Handle document removal
  const handleRemoveDocument = useCallback((documentId: string) => {
    // Remove from context if it's a selected document
    removeSelectedDocument(documentId)

    // If it's the URL document, navigate away
    if (urlSelectedDocument?.id === documentId) {
      setUrlSelectedDocument(null)
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', '/chat')
        window.location.reload()
      }
    }
  }, [removeSelectedDocument, urlSelectedDocument])

  // Check if any message is currently streaming
  const hasStreamingMessage = messages.some(msg => msg.role === 'assistant' && msg.isStreaming)

  // Get suggested questions based on document context
  const suggestedQuestions = useMemo(() => {
    return getSuggestedQuestions(documentContext)
  }, [documentContext])

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return

    try {
      await sendMessage(content.trim(), selectedModel)
      setError(null)
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
    }
  }, [sendMessage, selectedModel, setError])

  const handleCitationClick = useCallback((citation: Citation) => {
    // Handle citation click - could navigate to document section, show popup, etc.
    console.log('Citation clicked:', citation)
    // TODO: Implement citation click handler - maybe scroll to document section
  }, [])

  const handleSuggestedQuestionClick = useCallback((question: string) => {
    handleSendMessage(question)
  }, [handleSendMessage])

  // Handle copy message
  const handleCopy = useCallback((text: string) => {
    // Additional logic after copying if needed
    console.log('Message copied:', text.substring(0, 50) + '...')
  }, [])

  // Handle regenerate with model override
  const handleRegenerate = useCallback((modelOverride?: GeminiModelKey) => {
    regenerateLastMessage(modelOverride)
  }, [regenerateLastMessage])





  return (
    <div className="relative h-full flex bg-background">
      {/* Study Tools Panel - Fixed width sidebar */}
      <StudyToolsPanel
        documentId={effectiveDocumentId}
        conversationId={conversationId}
        selectedDocuments={selectedDocuments}
        primaryDocument={primaryDocument}
        hasMessages={messages.length > 0}
      />

      {/* Main Chat Area - Flexible width */}
      <motion.div
        className="flex flex-col h-full min-w-0 flex-1"
        variants={layoutVariants}
        animate={prefersReducedMotion ? undefined : layoutState}
        style={prefersReducedMotion ? {
          width: isCanvasOpen && isPanelExpanded
            ? '30%'
            : isCanvasOpen && !isPanelExpanded
            ? 'calc(100% - 48px - 40%)'
            : isPanelExpanded
            ? 'calc(100% - 25%)'
            : 'calc(100% - 48px)'
        } : undefined}
      >
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
            onRegenerate={handleRegenerate}
            onCopy={handleCopy}
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
          placeholder={
            selectedDocuments.length > 0
              ? `Ask about ${selectedDocuments.length > 1 ? 'your documents' : `"${selectedDocuments[0].title}"`}...`
              : urlSelectedDocument
                ? `Ask about "${urlSelectedDocument.title}"...`
                : "Ask about concepts, request summaries, or get explanations..."
          }
          maxLength={4000}
          autoFocus={false}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          selectedDocuments={selectedDocuments}
          urlSelectedDocument={urlSelectedDocument}
          onRemoveDocument={handleRemoveDocument}
        />
      </motion.div>

      {/* Study Tools Canvas - Appears on right when opened */}
      <StudyToolsCanvas />
    </div>
  )
})

ChatContainer.displayName = 'ChatContainer'
