'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Settings as SettingsIcon } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ChatContainer } from '@/components/chat/chat-container'
import { ChatHistoryDrawer } from '@/components/chat-history-drawer'
import { createThreadId, upsertThread, type ChatThread } from '@/lib/chat-history'
import type { GeminiModelKey } from '@/lib/ai-config'

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [chatInstanceKey, setChatInstanceKey] = useState<string>('default')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<GeminiModelKey>('FLASH')
  
  // Get chat context from URL params
  const chatType = searchParams.get('type') as 'course' | 'lesson' | 'document' | null
  const documentId = searchParams.get('documentId')
  const title = searchParams.get('title') || 'New Chat'

  // Initialize conversation
  useEffect(() => {
    const initializeConversation = async () => {
      try {
        const tempId = crypto.randomUUID()
        setConversationId(tempId)
      } catch (error) {
        console.error('Failed to initialize conversation:', error)
      }
    }

    initializeConversation()
  }, [chatType, documentId])

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

  // Actions
  const handleOpenHistory = useCallback(() => setHistoryOpen(true), [])
  const handleCloseHistory = useCallback(() => setHistoryOpen(false), [])

  const handleNewChat = useCallback(() => {
    // Create a new thread entry for visibility in history
    const id = createThreadId()
    const thread: ChatThread = {
      id,
      title: 'New Chat',
      documentId: documentId || null,
      preview: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messagesCount: 0,
    }
    upsertThread(thread)
    // Switch conversation and remount chat container to reset state
    setConversationId(id)
    setChatInstanceKey(id)
  }, [documentId])

  const handleSelectThread = useCallback((t: ChatThread) => {
    setConversationId(t.id)
    setChatInstanceKey(t.id)
    // Update URL if needed
    if (t.documentId) {
      const params = new URLSearchParams()
      params.set('documentId', t.documentId)
      params.set('type', 'document')
      router.push(`/chat?${params.toString()}`)
    }
  }, [router])

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
            documentId={documentId || undefined}
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