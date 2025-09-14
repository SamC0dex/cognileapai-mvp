'use client'

import React from 'react'

interface ChatEmptyStateProps {
  suggestedQuestions: string[]
  onQuestionClick: (question: string) => void
}

export const ChatEmptyState = React.memo<ChatEmptyStateProps>(({
  suggestedQuestions,
  onQuestionClick
}) => (
  <div className="text-center py-12 px-4 animate-fade-in optimized-container">
    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    </div>

    <h3 className="text-xl font-semibold text-foreground mb-3">Hey there! How can I help you today?</h3>
    <p className="text-muted-foreground mb-8 max-w-md mx-auto">
      I'm powered by Gemini AI and ready to assist with your questions.
    </p>

    {/* Suggested Questions */}
    {suggestedQuestions.length > 0 && (
      <div className="space-y-3 max-w-lg mx-auto">
        <p className="text-sm font-medium text-foreground mb-4">Try asking:</p>
        {suggestedQuestions.map((question, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(question)}
            className="w-full p-4 text-left bg-muted/50 hover:bg-muted rounded-xl border border-border hover:border-primary/20 group question-btn stagger-item animate-fade-in"
            style={{ animationDelay: `${i * 100 + 300}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                {question}
              </span>
              <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    )}
  </div>
))

ChatEmptyState.displayName = 'ChatEmptyState'