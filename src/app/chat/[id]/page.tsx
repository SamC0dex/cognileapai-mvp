'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings as SettingsIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ChatContainer } from '@/components/chat/chat-container'
import { ChatHistoryDrawer } from '@/components/chat-history-drawer'
import { createThreadId, upsertThread, type ChatThread } from '@/lib/chat-history'
import type { GeminiModelKey } from '@/lib/ai-config'

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const resolvedParams = use(params)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [chatInstanceKey, setChatInstanceKey] = useState<string>('default')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<GeminiModelKey>('FLASH')
  const [pageTitle, setPageTitle] = useState('CogniLeap AI Chat')
  const [documentId, setDocumentId] = useState<string | undefined>(undefined)
  const [chatType, setChatType] = useState<'course' | 'lesson' | 'document' | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Sanitize potentially unsafe titles from URL
  const sanitizeTitle = useCallback((raw: string): string => {
    try {
      let t = String(raw || '')
      t = t.replace(/[`"<>]/g, ' ')
      const looksLikePath = /^(?:[A-Za-z]:\\|\\\\|\/).+/.test(t)
      if (looksLikePath) {
        const base = t.split(/[\/\\]/).pop() || t
        t = base
      }
      t = t.replace(/\.[A-Za-z0-9]{1,5}$/i, '')
      t = t.replace(/\s+/g, ' ').trim()
      if (!t) return 'Untitled'
      return t.length > 60 ? `${t.slice(0, 57)}...` : t
    } catch {
      return 'Untitled'
    }
  }, [])

  // Get display title based on chat type
  const getDisplayTitle = useCallback(() => {
    const safe = sanitizeTitle(pageTitle)
    switch (chatType) {
      case 'course':
        return safe.startsWith('Course:') ? safe : `Course: ${safe}`
      case 'lesson':
        return safe.startsWith('Lesson:') ? safe : `Lesson: ${safe}`
      case 'document':
        return safe.startsWith('Document:') ? safe : `Document: ${safe}`
      default:
        return safe
    }
  }, [pageTitle, chatType, sanitizeTitle])

  // Initialize conversation from URL params
  useEffect(() => {
    if (isInitialized) return // Prevent double initialization

    const initializeFromParams = async () => {
      try {
        const chatId = resolvedParams.id

        if (chatId && chatId !== 'new') {
          // Load existing conversation
          setConversationId(chatId)
          setChatInstanceKey(chatId)

          // Get URL search params
          const urlChatType = searchParams.get('type') as 'course' | 'lesson' | 'document' | null
          const urlDocumentId = searchParams.get('documentId')
          const urlTitle = searchParams.get('title')

          setChatType(urlChatType)
          setDocumentId(urlDocumentId || undefined)

          // Try to get conversation details from chat history
          const { getThreads } = await import('@/lib/chat-history')
          const threads = await getThreads()
          const thread = threads.find(t => t.id === chatId)

          if (thread) {
            setPageTitle(thread.title || urlTitle || 'CogniLeap AI Chat')
            setDocumentId(thread.documentId || urlDocumentId || undefined)
          } else if (urlTitle) {
            setPageTitle(urlTitle)
          }

          setIsInitialized(true)
        } else {
          // Invalid chat ID - redirect to new chat
          router.replace('/chat')
        }
      } catch (error) {
        console.error('Failed to initialize conversation from params:', error)
        router.replace('/chat')
      }
    }

    initializeFromParams()
  }, [resolvedParams.id, searchParams, router, isInitialized])

  const handleBackToDashboard = () => {
    router.push('/dashboard')
  }

  const handleOpenHistory = useCallback(() => setHistoryOpen(true), [])
  const handleCloseHistory = useCallback(() => setHistoryOpen(false), [])

  const handleNewChat = useCallback(() => {
    // Create a new conversation and redirect
    const id = createThreadId()
    const thread: ChatThread = {
      id,
      title: 'New Chat',
      documentId: null,
      preview: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messagesCount: 0,
    }
    upsertThread(thread)
    router.push(`/chat/${id}`)
  }, [router])

  const handleSelectThread = useCallback((t: ChatThread) => {
    // Navigate directly to the selected thread
    router.push(`/chat/${t.id}`)
  }, [router])

  const handleCurrentChatDeleted = useCallback(() => {
    // Redirect to new chat when current chat is deleted
    router.push('/chat')
  }, [router])

  // Don't render until we have a conversation ID
  if (!conversationId) {
    return (
      <DashboardLayout>
        <div className="h-full flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading chat...</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full min-h-0 flex flex-col bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBackToDashboard}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Back to Dashboard"
                  aria-label="Back to Dashboard"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Page Title */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-foreground">
                      {getDisplayTitle()}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Powered by Gemini AI
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* New Chat */}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline">History</span>
                </button>

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
              </div>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 min-h-0">
          <ChatContainer
            key={chatInstanceKey}
            documentId={documentId}
            conversationId={conversationId}
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
          currentConversationId={conversationId}
          onCurrentChatDeleted={handleCurrentChatDeleted}
        />
      </div>
    </DashboardLayout>
  )
}