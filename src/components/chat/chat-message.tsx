'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MemoizedMarkdown } from './memoized-markdown'
import type { ChatMessageProps, Citation } from './types'

const formatRelativeTime = (date: Date): string => {
  const now = new Date()
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const CopyButton: React.FC<{ text: string }> = React.memo(({ text }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text:', err)
    }
  }, [text])

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? (
        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </motion.button>
  )
})

CopyButton.displayName = 'CopyButton'

const CitationLink: React.FC<{ 
  citation: Citation
  index: number
  onClick?: (citation: Citation) => void 
}> = React.memo(({ citation, index, onClick }) => {
  const handleClick = useCallback(() => {
    onClick?.(citation)
  }, [citation, onClick])

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded border border-primary/30 hover:border-primary/50 transition-all duration-200 cursor-pointer"
      style={{ verticalAlign: 'super', fontSize: '0.7em' }}
      title={`${citation.text}${citation.page ? ` (Page ${citation.page})` : ''}`}
    >
      {index + 1}
    </motion.button>
  )
})

CitationLink.displayName = 'CitationLink'

export const ChatMessage: React.FC<ChatMessageProps & {
  onRegenerate?: () => void
  onCopy?: (text: string) => void
  onThumbsUp?: () => void
  onThumbsDown?: () => void
}> = React.memo(({
  message,
  onCitationClick,
  showAvatar = true,
  showTimestamp = true,
  onRegenerate,
  onCopy,
  onThumbsUp,
  onThumbsDown
}) => {
  const { role, content, timestamp, isStreaming, citations, metadata } = message
  const [showActions, setShowActions] = useState(false)

  const customComponents = {
    // Custom code block component with copy button
    code({ children, className, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !match
      
      if (isInline) {
        return (
          <code 
            className="px-1.5 py-0.5 text-sm bg-muted rounded border font-mono text-primary"
            {...props}
          >
            {children}
          </code>
        )
      }

      const codeText = String(children).replace(/\n$/, '')
      
      return (
        <div className="group relative my-4">
          <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 overflow-x-auto text-sm">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
          <CopyButton text={codeText} />
        </div>
      )
    },

    // Enhanced list styling
    ul({ children }: any) {
      return <ul className="list-disc pl-6 space-y-1 my-3">{children}</ul>
    },

    ol({ children }: any) {
      return <ol className="list-decimal pl-6 space-y-1 my-3">{children}</ol>
    },

    // Enhanced paragraph spacing
    p({ children }: any) {
      return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
    },

    // Enhanced blockquote styling
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/30 rounded-r">
          {children}
        </blockquote>
      )
    },

    // Enhanced headers
    h1({ children }: any) {
      return <h1 className="text-xl font-bold mt-6 mb-3 first:mt-0">{children}</h1>
    },

    h2({ children }: any) {
      return <h2 className="text-lg font-semibold mt-5 mb-2">{children}</h2>
    },

    h3({ children }: any) {
      return <h3 className="text-base font-medium mt-4 mb-2">{children}</h3>
    },

    // Enhanced table styling
    table({ children }: any) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse border border-border rounded-lg">
            {children}
          </table>
        </div>
      )
    },

    th({ children }: any) {
      return (
        <th className="border border-border px-3 py-2 bg-muted font-semibold text-left">
          {children}
        </th>
      )
    },

    td({ children }: any) {
      return (
        <td className="border border-border px-3 py-2">
          {children}
        </td>
      )
    },

    // Enhanced strong/bold
    strong({ children }: any) {
      return <strong className="font-semibold text-foreground">{children}</strong>
    },

    // Enhanced emphasis
    em({ children }: any) {
      return <em className="italic text-muted-foreground">{children}</em>
    }
  }

  const handleCopyMessage = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      onCopy?.(content)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }, [content, onCopy])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-6 group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex ${role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-[90%] md:max-w-[85%]`}>
        {/* Modern Avatar */}
        {showAvatar && (
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center shadow-sm ${
            role === 'user'
              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground'
              : 'bg-gradient-to-br from-muted to-muted/80 border border-border/50'
          }`}>
            {role === 'user' ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        )}

        {/* Message Content */}
        <div className="flex flex-col space-y-1">
          {/* Enhanced Message Bubble */}
          <div
            className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed relative transition-all duration-200 ${
              role === 'user'
                ? 'bg-primary/8 text-foreground rounded-br-md border border-primary/15 shadow-sm hover:shadow-md'
                : 'bg-background text-foreground rounded-bl-md border border-border/40 shadow-sm hover:shadow-md hover:border-border/60'
            }`}
          >
            {/* Elegant loading dots - no text, just beautiful animation */}
            {isStreaming && role === 'assistant' && content.length === 0 && (
              <div className="flex items-center justify-start py-2">
                <div className="flex items-center space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1, 0.8]
                      }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Optimized Markdown Content with Memoization */}
            <MemoizedMarkdown
              content={content}
              isStreaming={isStreaming}
              customComponents={customComponents}
            />

            {/* Citations */}
            {citations && citations.length > 0 && !isStreaming && (
              <div className="mt-3 pt-2 border-t border-border/30">
                <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {citations.map((citation, index) => (
                    <CitationLink
                      key={citation.id}
                      citation={citation}
                      index={index}
                      onClick={onCitationClick}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Metadata for AI messages */}
            {role === 'assistant' && message.metadata && !isStreaming && (
              <div className="mt-3 pt-2 border-t border-border/30 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  {message.metadata.model && (
                    <span className="font-medium">{message.metadata.model}</span>
                  )}
                  {message.metadata.tokens && (
                    <span>{message.metadata.tokens} tokens</span>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {role === 'assistant' && !isStreaming && (
              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-1 mt-3 pt-2 border-t border-border/20"
                  >
                    {/* Copy Button */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopyMessage}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors group/btn"
                      title="Copy message"
                    >
                      <svg className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </motion.button>

                    {/* Thumbs Up */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onThumbsUp}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors group/btn"
                      title="Good response"
                    >
                      <svg className="w-4 h-4 text-muted-foreground group-hover/btn:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2v0a2 2 0 00-2 2v5m-4 0H4m0 0L2 10m2 0l2 2" />
                      </svg>
                    </motion.button>

                    {/* Thumbs Down */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onThumbsDown}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors group/btn"
                      title="Poor response"
                    >
                      <svg className="w-4 h-4 text-muted-foreground group-hover/btn:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2v0a2 2 0 002-2v-5m-4 0h8m0 0l2-2m-2 2l-2-2" />
                      </svg>
                    </motion.button>

                    {/* Regenerate */}
                    {onRegenerate && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onRegenerate}
                        className="p-2 rounded-md hover:bg-muted/50 transition-colors group/btn"
                        title="Regenerate response"
                      >
                        <svg className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </motion.button>
                    )}

                    {/* More Options */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-md hover:bg-muted/50 transition-colors group/btn"
                      title="More options"
                    >
                      <svg className="w-4 h-4 text-muted-foreground group-hover/btn:text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>

          {/* Timestamp */}
          {showTimestamp && (
            <div className={`text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
              role === 'user' ? 'text-right' : 'text-left'
            }`}>
              {formatRelativeTime(timestamp)}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
})

ChatMessage.displayName = 'ChatMessage'