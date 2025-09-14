'use client'

import React, { useState, useEffect } from 'react'

interface ChatScrollButtonProps {
  show: boolean
  onScrollToBottom: () => void
}

export const ChatScrollButton = React.memo<ChatScrollButtonProps>(({
  show,
  onScrollToBottom
}) => {
  const [isVisible, setIsVisible] = useState(show)
  const [shouldAnimate, setShouldAnimate] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      setShouldAnimate(true)
    } else if (isVisible) {
      setShouldAnimate(false)
      const timer = setTimeout(() => setIsVisible(false), 200)
      return () => clearTimeout(timer)
    }
  }, [show, isVisible])

  if (!isVisible) return null

  return (
    <div className={`absolute bottom-20 right-4 z-10 ${shouldAnimate ? 'scroll-button-enter' : 'scroll-button-exit'}`}>
      <button
        onClick={onScrollToBottom}
        className="w-10 h-10 bg-background border border-border shadow-lg rounded-full flex items-center justify-center hover:bg-muted btn-hover"
      >
        <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>
    </div>
  )
})

ChatScrollButton.displayName = 'ChatScrollButton'