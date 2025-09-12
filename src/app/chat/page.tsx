'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useChat } from 'ai/react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { ChatContainer } from '@/components/chat'
import { GEMINI_MODELS } from '@/lib/ai-config'
import type { ChatMessage } from '@/components/chat/types'

interface ChatPageProps {}

export default function ChatPage({}: ChatPageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(null)
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

  // Get display title based on chat type
  const getDisplayTitle = () => {
    switch (chatType) {
      case 'course':
        return title.startsWith('Course:') ? title : `Course: ${title}`
      case 'lesson':
        return title.startsWith('Lesson:') ? title : `Lesson: ${title}`
      case 'document':
        return title.startsWith('Document:') ? title : `Document: ${title}`
      default:
        return 'CogniLeap AI Chat'
    }
  }

  const isEmpty = convertedMessages.length === 0

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
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{getDisplayTitle()}</h1>
                  <p className="text-sm text-muted-foreground">
                    {chatType === 'course' && 'AI-powered course creation and guidance'}
                    {chatType === 'lesson' && 'Interactive lesson planning and development'}
                    {chatType === 'document' && 'Document analysis and study material generation'}
                    {!chatType && 'Your AI learning companion'}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                {/* Model Indicator */}
                <div className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                  {GEMINI_MODELS[selectedModel].displayName}
                </div>
                <button className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Export Chat
                </button>
                <button className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Settings
                </button>
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
            documentId="demo-document"
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}
