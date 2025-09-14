'use client'

import React from 'react'

interface ChatHeaderProps {
  messageCount: number
  onClearChat: () => void
}

export const ChatHeader = React.memo<ChatHeaderProps>(({
  messageCount,
  onClearChat
}) => {
  if (messageCount === 0) return null

  return (
    <div className="flex-shrink-0 px-4 py-2 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {messageCount} message{messageCount !== 1 ? 's' : ''}
        </div>
        <button
          onClick={onClearChat}
          className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/20 rounded-md btn-hover"
        >
          Clear Chat
        </button>
      </div>
    </div>
  )
})

ChatHeader.displayName = 'ChatHeader'