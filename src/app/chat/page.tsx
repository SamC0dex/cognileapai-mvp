'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings as SettingsIcon } from 'lucide-react'
import { useChat } from 'ai/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ChatContainer } from '@/components/chat'
import type { ChatMessage } from '@/components/chat/types'
import { ChatHistoryDrawer } from '@/components/chat-history-drawer'
import { Button } from '@/components/ui'
import { createThreadId, upsertThread, type ChatThread } from '@/lib/chat-history'

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(null)
  // Force remount of ChatContainer on new chat to reset local state cleanly
  const [chatInstanceKey, setChatInstanceKey] = useState<string>('default')
  // Chat history drawer state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<import('@/lib/ai-config').GeminiModelKey>('FLASH')
  
  // Get chat context from URL params
  const chatType = searchParams.get('type') as 'course' | 'lesson' | 'document' | null
  const documentId = searchParams.get('documentId')
  const title = searchParams.get('title') || 'New Chat'

  // Use AI SDK's useChat hook
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading: aiIsLoading,
    error,
    setMessages
  } = useChat({
    id: `chat-${selectedModel}`,
    api: '/api/chat',
    body: {
      chatType: chatType || 'general',
      documentId,
      conversationId,
      preferredModel: selectedModel
    },
    onError: (error) => {
      console.error('Chat error:', error)
    }
  })

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        // TODO: Create conversation in database and get ID
        // For now, generate a temporary ID
        const tempId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        setConversationId(tempId)
      } catch (error) {
        console.error('Failed to initialize conversation:', error)
      }
    }

    initializeConversation()
  }, [chatType, documentId])

  // Convert AI SDK messages to our ChatMessage format
  const convertedMessages: ChatMessage[] = messages.map((msg, index) => ({
    id: msg.id || `msg_${index}`,
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
    timestamp: new Date(),
    isStreaming: false, // AI SDK handles streaming internally
    metadata: msg.role === 'assistant' ? {
      model: 'gemini-auto-selected',
    } : undefined
  }))

  // Handle sending messages through our custom logic
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || aiIsLoading) return

    try {
      // Use AI SDK's built-in submit functionality
      const syntheticEvent = {
        preventDefault: () => {},
        target: { value: content }
      } as any

      // Set input value and submit
      handleInputChange({ target: { value: content } } as any)
      
      // Submit after a brief delay to ensure input is set
      setTimeout(() => {
        handleSubmit(syntheticEvent)
      }, 10)

    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Generate contextual suggested questions
  const getSuggestedQuestions = () => {
    switch (chatType) {
      case 'course':
        return [
          'Help me create a comprehensive course outline',
          'What topics should I cover in this course?',
          'How should I structure my learning materials?'
        ]
      case 'lesson':
        return [
          'Create a detailed lesson plan for me',
          'What key concepts should I focus on?',
          'Help me design engaging activities'
        ]
      case 'document':
        return [
          'Analyze this document and provide key insights',
          'Create study notes from this content',
          'Generate practice questions based on this material'
        ]
      default:
        return [
          'How can I help you learn today?',
          'What would you like to create or study?',
          'Tell me about your learning goals'
        ]
    }
  }

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  // Sanitize potentially unsafe or noisy titles from URL (e.g., local file paths)
  const sanitizeTitle = (raw: string): string => {
    try {
      let t = String(raw || '')
      // Remove characters that can look odd in headers
      t = t.replace(/[`"<>]/g, ' ')
      // If it looks like a path, keep only the filename
      const looksLikePath = /^(?:[A-Za-z]:\\|\\\\|\/).+/.test(t)
      if (looksLikePath) {
        const base = t.split(/[\/\\]/).pop() || t
        t = base
      }
      // Drop common file extensions
      t = t.replace(/\.[A-Za-z0-9]{1,5}$/i, '')
      // Collapse whitespace
      t = t.replace(/\s+/g, ' ').trim()
      // Fallback if empty after cleanup
      if (!t) return 'Untitled'
      // Prevent overly long headers
      return t.length > 60 ? `${t.slice(0, 57)}...` : t
    } catch {
      return 'Untitled'
    }
  }

  // Get display title based on chat type
  const getDisplayTitle = () => {
    const safe = sanitizeTitle(title)
    switch (chatType) {
      case 'course':
        return safe.startsWith('Course:') ? safe : `Course: ${safe}`
      case 'lesson':
        return safe.startsWith('Lesson:') ? safe : `Lesson: ${safe}`
      case 'document':
        return safe.startsWith('Document:') ? safe : `Document: ${safe}`
      default:
        return 'CogniLeap AI Chat'
    }
  }

  const isEmpty = convertedMessages.length === 0

  // Actions
  const handleOpenHistory = useCallback(() => setHistoryOpen(true), [])
  const handleCloseHistory = useCallback(() => setHistoryOpen(false), [])

  const handleNewChat = useCallback(() => {
    // Create a new thread entry for visibility in history
    const id = createThreadId()
    const thread: ChatThread = {
      id,
      title: 'New Chat',
      documentId: 'demo-document',
      preview: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messagesCount: 0,
    }
    upsertThread(thread)
    // Switch conversation and remount chat container to reset state
    setConversationId(id)
    setChatInstanceKey(id)
  }, [])

  const handleSelectThread = useCallback((t: ChatThread) => {
    setConversationId(t.id)
    setChatInstanceKey(t.id)
  }, [])

  return (
    <DashboardLayout>
      <div className="h-full min-h-0 flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    console.log('Back button clicked - using direct navigation');
                    window.location.href = '/dashboard';
                  }}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Back to Dashboard"
                  aria-label="Back to Dashboard"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {/* Intentionally removed header title/description to avoid showing file paths or clutter */}
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* New Chat */}
                {/* Light mode: subtle primary tint */}
                <button
                  onClick={handleNewChat}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  title="Start a new chat"
                  aria-label="New Chat"
                  type="button"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v12m6-6H6" />
                  </svg>
                  <span className="hidden sm:inline">New Chat</span>
                </button>

                {/* Chat History */}
                <button
                  onClick={handleOpenHistory}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  title="Open chat history"
                  aria-label="Chat History"
                  type="button"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 6v12" />
                  </svg>
                  <span className="hidden sm:inline">Chat History</span>
                </button>
                <Button
                  onClick={handleOpenHistory}
                  variant="purple"
                  className="hidden h-10 px-3.5 rounded-xl gap-2"
                  title="Open chat history"
                  aria-label="Chat History"
                  type="button"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 6v12" />
                  </svg>
                  <span className="hidden sm:inline">Chat History</span>
                </Button>

                {/* Settings */}
                <button
                  onClick={() => console.log('Open settings')}
                  className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  title="Settings"
                  aria-label="Settings"
                  type="button"
                >
                  <SettingsIcon className="w-[18px] h-[18px]" />
                  <span className="hidden sm:inline">Settings</span>
                </button>
                <Button
                  onClick={() => console.log('Open settings')}
                  variant="purple"
                  className="hidden h-10 px-3.5 rounded-xl gap-2"
                  title="Settings"
                  aria-label="Settings"
                  type="button"
                >
                  <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.983 4.078a1 1 0 01.034 0c.63.033 1.264.117 1.879.25a1 1 0 01.746.66l.267.822a1 1 0 00.96.686h.862a1 1 0 01.986.835c.098.595.156 1.202.172 1.812a1 1 0 01-.33.764l-.633.58a1 1 0 000 1.464l.633.58a1 1 0 01.33.764 11.3 11.3 0 01-.172 1.812 1 1 0 01-.986.835h-.862a1 1 0 00-.96.686l-.267.822a1 1 0 01-.746.66c.615-.133 1.25-.217 1.879-.25zM12 9.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />
                  </svg>
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Chat Error
                </p>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error.message || 'An error occurred while processing your message.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 min-h-0">
          <ChatContainer
            key={chatInstanceKey}
            documentId="demo-document"
            conversationId={conversationId || undefined}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>

        {/* Chat History Drawer */}
        <ChatHistoryDrawer
          open={historyOpen}
          onClose={handleCloseHistory}
          onSelectThread={handleSelectThread}
          onNewChat={handleNewChat}
        />
      </div>
    </DashboardLayout>
  )
}
