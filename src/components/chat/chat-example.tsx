'use client'

import React from 'react'
import { ChatContainer } from './chat-container'
import { useChat } from '@/lib/use-chat'

/**
 * Example component demonstrating how to use the complete chat system
 * This shows the simplest integration pattern
 */
interface ChatExampleProps {
  documentId: string
  conversationId?: string
}

export function ChatExample({ documentId, conversationId }: ChatExampleProps) {
  const {
    // Core state
    messages,
    isLoading,
    isStreaming,
    error,
    hasMessages,
    
    // Actions
    sendMessage,
    clearChat,
    regenerateLastMessage,
    createConversation
  } = useChat(documentId, conversationId)

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-background">
        <h1 className="text-2xl font-bold">Chat with Document</h1>
        
        {/* Status */}
        <div className="flex items-center gap-4 mt-2">
          <div className="text-sm text-muted-foreground">
            Document ID: {documentId}
          </div>
          
          {error && (
            <div className="text-sm text-red-600">
              Error: {error}
            </div>
          )}
          
          {isStreaming && (
            <div className="text-sm text-blue-600">
              AI is responding...
            </div>
          )}
        </div>

        {/* Actions */}
        {hasMessages && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={clearChat}
              disabled={isStreaming}
              className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50"
            >
              Clear Chat
            </button>
            
            <button
              onClick={regenerateLastMessage}
              disabled={isStreaming}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
            >
              Regenerate Last
            </button>
            
            <button
              onClick={() => createConversation().then(console.log)}
              disabled={isStreaming}
              className="px-3 py-1 text-sm bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 disabled:opacity-50"
            >
              New Conversation
            </button>
          </div>
        )}
      </div>

      {/* Chat Container - This handles everything automatically */}
      <div className="flex-1">
        <ChatContainer
          documentId={documentId}
          conversationId={conversationId}
        />
      </div>
    </div>
  )
}

/**
 * Example of a minimal chat integration
 */
export function MinimalChatExample({ documentId }: { documentId: string }) {
  return (
    <div className="h-96">
      <ChatContainer documentId={documentId} />
    </div>
  )
}