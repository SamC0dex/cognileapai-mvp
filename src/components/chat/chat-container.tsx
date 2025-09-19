'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ChatInput } from './chat-input'
import { ChatMessages } from './chat-messages'
import { ChatEmptyState } from './chat-empty-state'
import { ChatScrollButton } from './chat-scroll-button'
import { ContextWarning } from './context-warning'
import { useChat } from '@/lib/use-chat'
import { getSuggestedQuestions } from '@/lib/chat-store'
import type { GeminiModelKey } from '@/lib/ai-config'
import type { Citation } from './types'
import { createClient } from '@supabase/supabase-js'
import { useDocuments } from '@/contexts/documents-context'
import { StudyToolsPanel, useStudyToolsStore } from '@/components/study-tools'
import { FlashcardViewer } from '@/components/study-tools/flashcard-viewer'
// Fullscreen canvas will be created inline
import { useFlashcardStore } from '@/lib/flashcard-store'
import { motion, useReducedMotion } from 'framer-motion'
import type { DocumentUploadedDetail } from '@/types/documents'
import {
  Copy,
  Download,
  Minimize2,
  Check,
  Sparkles,
  X,
  FileText,
  Calendar,
  ZoomIn,
  Plus,
  Minus
} from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
  // Panel expanded, no canvas (40% panel, 60% chat)
  panelExpanded: {
    width: '60%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
      mass: 0.5,
      duration: 0.3
    }
  },
  // Panel expanded with canvas (50% panel, 50% chat)
  panelExpandedCanvas: {
    width: '50%',
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
  const {
    selectedDocuments,
    primaryDocument,
    removeSelectedDocument,
    updateDocumentStatus,
    addSelectedDocument,
    clearSelectedDocuments
  } = useDocuments()
  const { isPanelExpanded, isCanvasOpen, isCanvasFullscreen, canvasContent } = useStudyToolsStore()
  const { isViewerOpen, currentFlashcardSet, isFullscreen, closeViewer, toggleFullscreen } = useFlashcardStore()
  const prefersReducedMotion = useReducedMotion()

  // Use primary selected document if no URL document is provided
  const effectiveDocumentId = documentId || primaryDocument?.id

  // Memoize the current layout state for performance
  const layoutState = useMemo(() => {
    if (isPanelExpanded && isCanvasOpen) return 'panelExpandedCanvas'
    if (isPanelExpanded) return 'panelExpanded'
    return 'panelCollapsed'
  }, [isCanvasOpen, isPanelExpanded])

  // Use the chat hook for all chat functionality
  const {
    messages,
    isLoading,
    error,
    documentContext,
    sendMessage,
    regenerateLastMessage,
    setError,
    conversationTokens,
    contextWarning,
    updateTokenTracking,
    resetState
  } = useChat(effectiveDocumentId, conversationId, selectedDocuments)

  const [showScrollButton, setShowScrollButton] = useState(false)
  const [scrollTrigger, setScrollTrigger] = useState(0)
  const [urlSelectedDocument, setUrlSelectedDocument] = useState<{
    id: string
    title: string
    size?: number
    processing_status?: string
  } | null>(null)
  const lastUploadedDocumentRef = useRef<DocumentUploadedDetail['document'] | null>(null)

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

      if (lastUploadedDocumentRef.current?.id === documentId) {
        const doc = lastUploadedDocumentRef.current
        setUrlSelectedDocument({
          id: doc.id,
          title: doc.title,
          size: doc.bytes ?? undefined,
          processing_status: doc.processing_status ?? undefined
        })
        lastUploadedDocumentRef.current = null
        return
      }

      try {
        const { data, error } = await supabase
          .from('documents')
          .select('id, title, bytes, processing_status')
          .eq('id', documentId)
          .single()

        if (error) {
          if (error.message) {
            console.error('Error fetching document:', error)
          }
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
    const handleDocumentUploaded = (event: Event) => {
      const customEvent = event as CustomEvent<DocumentUploadedDetail>
      const uploadedDocument = customEvent.detail?.document

      if (!uploadedDocument) return

      lastUploadedDocumentRef.current = uploadedDocument

      const selectedDoc = {
        id: uploadedDocument.id,
        title: uploadedDocument.title,
        size: uploadedDocument.bytes ?? undefined,
        processing_status: uploadedDocument.processing_status ?? undefined
      }

      clearSelectedDocuments()
      addSelectedDocument(selectedDoc)
      setUrlSelectedDocument(selectedDoc)

      if (uploadedDocument.processing_status) {
        updateDocumentStatus(uploadedDocument.id, uploadedDocument.processing_status)
      } else {
        updateDocumentStatus(uploadedDocument.id, 'processing')
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('document-uploaded', handleDocumentUploaded as EventListener)
      return () => window.removeEventListener('document-uploaded', handleDocumentUploaded as EventListener)
    }
  }, [addSelectedDocument, clearSelectedDocuments, updateDocumentStatus])

  // Update token tracking when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateTokenTracking()
    }
  }, [messages, updateTokenTracking])

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
          width: isPanelExpanded && isCanvasOpen
            ? '50%'
            : isPanelExpanded
            ? '60%'
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

        {/* Context Warning - Show when approaching token limits */}
        <ContextWarning
          conversationTokens={conversationTokens}
          contextWarning={contextWarning}
          onStartNewChat={() => resetState()}
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
            onRegenerate={handleRegenerate}
            onCopy={handleCopy}
            forceScrollToBottom={scrollTrigger}
            conversationTokens={conversationTokens || undefined}
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

      {/* Fullscreen Flashcard Viewer - Rendered at this level to respect sidebar layout */}
      {isViewerOpen && currentFlashcardSet && isFullscreen && (
        <div className="absolute inset-0 bg-background z-40">
          <FlashcardViewer
            flashcards={currentFlashcardSet.cards}
            title={currentFlashcardSet.title}
            onClose={closeViewer}
            isFullscreen={true}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      )}

      {/* Fullscreen Canvas Viewer - Rendered at this level to respect sidebar layout */}
      {isCanvasOpen && canvasContent && isCanvasFullscreen && (
        <FullscreenCanvas />
      )}
    </div>
  )
})

// Fullscreen Canvas Component
const FullscreenCanvas: React.FC = () => {
  const { canvasContent, closeCanvas, toggleCanvasFullscreen, copyToClipboard, downloadAsPDF, downloadAsDOCX } = useStudyToolsStore()
  const [isCopied, setIsCopied] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showZoomControl, setShowZoomControl] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)

  if (!canvasContent) return null

  const handleCopy = async () => {
    const success = await copyToClipboard(canvasContent.content)
    if (success) {
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await downloadAsPDF(canvasContent)
      setShowExportMenu(false)
    } catch (error) {
      console.error('PDF download failed:', error)
    }
  }

  const handleDownloadDOCX = async () => {
    try {
      await downloadAsDOCX(canvasContent)
      setShowExportMenu(false)
    } catch (error) {
      console.error('DOCX download failed:', error)
    }
  }

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 10, 200))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 10, 50))
  }

  const handleResetZoom = () => {
    setZoomLevel(100)
  }

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (showZoomControl && !target.closest('[data-zoom-control]')) {
        setShowZoomControl(false)
      }
      if (showExportMenu && !target.closest('[data-export-menu]')) {
        setShowExportMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showZoomControl, showExportMenu])

  return (
    <div className="absolute inset-0 bg-background z-40">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold text-xl text-foreground">
                {canvasContent.title}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {canvasContent.createdAt.toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Fullscreen Reading Mode
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom button */}
            <div className="relative" data-zoom-control>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowZoomControl(!showZoomControl)}
                title="Zoom control"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>

              {showZoomControl && (
                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 bg-popover border border-border rounded-xl shadow-xl z-[9999] overflow-hidden whitespace-nowrap">
                  <div className="flex items-center bg-background/95 backdrop-blur-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 50}
                      className="rounded-none border-r border-border px-3 py-2 h-10"
                      title="Zoom out"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="px-4 py-2 min-w-[60px] text-center text-sm font-medium bg-background border-r border-border">
                      {zoomLevel}%
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 200}
                      className="rounded-none px-3 py-2 h-10"
                      title="Zoom in"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Copy button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className={cn(
                "transition-all duration-200",
                isCopied && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              )}
              title={isCopied ? "Copied!" : "Copy to clipboard"}
            >
              {isCopied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>

            {/* Export button */}
            <div className="relative" data-export-menu>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowExportMenu(!showExportMenu)}
                title="Export options"
              >
                <Download className="w-4 h-4" />
              </Button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-xl shadow-xl z-[9999]">
                  <div className="p-1">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      Download as PDF
                    </button>
                    <button
                      onClick={handleDownloadDOCX}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent"
                    >
                      <FileText className="w-4 h-4 text-blue-500" />
                      Download as Text
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Exit fullscreen */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleCanvasFullscreen}
              title="Exit fullscreen"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>

            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={closeCanvas}
              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              title="Close canvas"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="max-w-4xl mx-auto px-8 py-8 transition-transform duration-200 origin-top"
            style={{ transform: `scale(${zoomLevel / 100})` }}
          >
            <div className="bg-background/80 rounded-lg border border-border/50 shadow-lg px-8 py-6 backdrop-blur-sm">
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {canvasContent.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

ChatContainer.displayName = 'ChatContainer'
