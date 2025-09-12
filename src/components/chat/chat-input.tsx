'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GEMINI_MODELS, GeminiModelKey } from '@/lib/ai-config'
import { useChatStore } from '@/lib/chat-store'
import type { ChatInputProps } from './types'

const MIN_HEIGHT = 44 // Minimum height for textarea
const MAX_HEIGHT = 144 // Maximum height (4 lines * 36px)
const LINE_HEIGHT = 24 // Approximate line height

export const ChatInput: React.FC<ChatInputProps & {
  selectedModel?: GeminiModelKey
  onModelChange?: (model: GeminiModelKey) => void
}> = React.memo(({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message here...',
  maxLength = 4000,
  autoFocus = false,
  selectedModel = 'FLASH',
  onModelChange
}) => {
  const [inputValue, setInputValue] = useState('')
  const [textareaHeight, setTextareaHeight] = useState(MIN_HEIGHT)
  const [showModelSelector, setShowModelSelector] = useState(false)
  const [showToolsSelector, setShowToolsSelector] = useState(false)
  // const [lastUserMessage, setLastUserMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Get streaming status from chat store
  const { streamingMessage, messages } = useChatStore()
  const isSending = Boolean(streamingMessage)

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [autoFocus])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        textareaRef.current?.focus()
        setShowModelSelector(false)
        setShowToolsSelector(false)
      }
      
      // Cmd/Ctrl + Shift + K: Focus input and clear
      else if ((e.metaKey || e.ctrlKey) && e.key === 'K' && e.shiftKey) {
        e.preventDefault()
        setInputValue('')
        setTextareaHeight(MIN_HEIGHT)
        textareaRef.current?.focus()
        setShowModelSelector(false)
        setShowToolsSelector(false)
      }
    }

    // Only add global shortcuts when not in an input field
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true'
      
      if (!isInInput) {
        handleGlobalKeydown(e)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Calculate textarea height based on content
  const calculateHeight = useCallback(() => {
    if (textareaRef.current) {
      // Reset height to get accurate scrollHeight
      textareaRef.current.style.height = `${MIN_HEIGHT}px`
      
      const scrollHeight = textareaRef.current.scrollHeight
      const newHeight = Math.min(Math.max(scrollHeight, MIN_HEIGHT), MAX_HEIGHT)
      
      setTextareaHeight(newHeight)
      textareaRef.current.style.height = `${newHeight}px`
    }
  }, [])

  // Clear function
  const handleClear = useCallback(() => {
    setInputValue('')
    setTextareaHeight(MIN_HEIGHT)
    if (textareaRef.current) {
      textareaRef.current.style.height = `${MIN_HEIGHT}px`
      textareaRef.current.focus()
    }
  }, [])

  // Update height when input value changes
  useEffect(() => {
    calculateHeight()
  }, [inputValue, calculateHeight])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxLength) {
      setInputValue(value)
    }
  }, [maxLength])

  const handleSendMessage = useCallback(async () => {
    const trimmedValue = inputValue.trim()
    
    if (!trimmedValue || isSending || disabled) return

    try {
      await onSendMessage(trimmedValue)
      setInputValue('')
      
      // Reset textarea height
      setTextareaHeight(MIN_HEIGHT)
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`
        textareaRef.current.focus()
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [inputValue, isSending, disabled, onSendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter: Send message (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
    
    // Escape: Clear input
    else if (e.key === 'Escape') {
      e.preventDefault()
      handleClear()
    }
    
    // Up arrow: Edit last user message (if input is empty and at start)
    else if (e.key === 'ArrowUp' && inputValue === '' && textareaRef.current?.selectionStart === 0) {
      e.preventDefault()
      const userMessages = messages.filter(msg => msg.role === 'user')
      const lastUserMsg = userMessages[userMessages.length - 1]
      if (lastUserMsg) {
        setInputValue(lastUserMsg.content)
        // setLastUserMessage(lastUserMsg.content)
        // Move cursor to end
        setTimeout(() => {
          if (textareaRef.current) {
            const length = lastUserMsg.content.length
            textareaRef.current.setSelectionRange(length, length)
          }
        }, 0)
      }
    }
    
    // Ctrl/Cmd + A: Select all
    else if ((e.ctrlKey || e.metaKey) && e.key === 'a' && inputValue) {
      // Let default behavior handle this
    }
    
    // Ctrl/Cmd + V: Handle paste (support for multi-line)
    else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Let default paste behavior handle this, but recalculate height
      setTimeout(calculateHeight, 0)
    }
  }, [handleSendMessage, inputValue, messages, calculateHeight])

  // Listen for custom clear event
  useEffect(() => {
    const handleCustomClear = () => {
      setInputValue('')
      setTextareaHeight(MIN_HEIGHT)
      if (textareaRef.current) {
        textareaRef.current.style.height = `${MIN_HEIGHT}px`
        textareaRef.current.focus()
      }
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('chat-clear', handleCustomClear)
      return () => textarea.removeEventListener('chat-clear', handleCustomClear)
    }
  }, [])

  const isOverLimit = inputValue.length > maxLength * 0.8
  const showCharacterCount = inputValue.length > 500 || isOverLimit
  const canSend = inputValue.trim().length > 0 && !isSending && !disabled

  const handleModelSelect = useCallback((model: GeminiModelKey) => {
    onModelChange?.(model)
    setShowModelSelector(false)
  }, [onModelChange])

  const toggleModelSelector = useCallback(() => {
    setShowModelSelector(!showModelSelector)
    if (!showModelSelector) setShowToolsSelector(false)
  }, [showModelSelector])

  const toggleToolsSelector = useCallback(() => {
    setShowToolsSelector(!showToolsSelector)
    if (!showToolsSelector) setShowModelSelector(false)
  }, [showToolsSelector])

  const handleToolSelect = useCallback((tool: 'study_guide' | 'smart_summary' | 'smart_notes' | 'flashcards') => {
    const presets: Record<string, string> = {
      study_guide: 'Create a thorough study guide for this material with sections, key terms, and practice questions.',
      smart_summary: 'Write a concise, structured summary of the main points and insights.',
      smart_notes: 'Produce smart notes: bullet points, definitions, examples, and takeaways.',
      flashcards: 'Generate a high-quality set of Q&A flashcards that cover key concepts.'
    }
    const preset = presets[tool]
    setInputValue(preset)
    setShowToolsSelector(false)
    requestAnimationFrame(() => {
      calculateHeight()
      textareaRef.current?.focus()
    })
  }, [calculateHeight])

  return (
    <div className="border-t border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Main Input Container */}
        <div className="relative">
          {/* Let height be natural so the textarea stays inside the card */}
          <div
            className="relative bg-background rounded-2xl border border-border/50 ring-1 ring-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 focus-within:border-primary/40 focus-within:ring-primary/20 focus-within:shadow-primary/10"
          >
            {/* Model Selector & Controls Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div className="flex items-center gap-3">
                {/* Model Selector */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleModelSelector}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary rounded-lg border border-primary/20 hover:bg-primary/15 transition-all duration-200 dark:bg-primary/20 dark:border-primary/40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>{GEMINI_MODELS[selectedModel].displayName}</span>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showModelSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.button>
                  
                  {/* Model Dropdown */}
                  <AnimatePresence>
                    {showModelSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="absolute bottom-full left-0 mb-2 w-72 max-h-[60vh] overflow-auto bg-background rounded-xl border border-border shadow-xl z-50"
                      >
                        <div className="p-2">
                          {Object.entries(GEMINI_MODELS).map(([key, model]) => (
                            <motion.button
                              key={key}
                              whileHover={{ scale: 1.01, x: 4 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleModelSelect(key as GeminiModelKey)}
                              className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                                selectedModel === key
                                  ? 'bg-primary/15 text-primary border border-primary/20'
                                  : 'hover:bg-muted/50 text-foreground'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">{model.displayName}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">{model.description}</div>
                                </div>
                                <div className={`px-2 py-1 text-xs rounded-full ${
                                  model.costTier === 'low' ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                                  model.costTier === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                                  'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                                }`}>
                                  {model.costTier}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Search removed by request */}
                {/* Attach button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => console.log('attach')}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted/50 text-foreground"
                  title="Attach"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.44 11.05l-7.07 7.07a5 5 0 11-7.07-7.07l7.07-7.07a3 3 0 114.24 4.24l-7.07 7.07a1 1 0 01-1.42-1.42l6.36-6.36" />
                  </svg>
                </motion.button>

                {/* Tools button */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={toggleToolsSelector}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border border-border hover:bg-muted/50 text-foreground"
                    title="Tools"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="6" cy="8" r="1.5"/>
                      <circle cx="6" cy="16" r="1.5"/>
                      <path d="M10 8h8M10 16h8" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <span>Tools</span>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${showToolsSelector ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.button>
                  <AnimatePresence>
                    {showToolsSelector && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="absolute bottom-full left-0 mb-2 w-80 max-h-[60vh] overflow-auto bg-background rounded-xl border border-border shadow-xl z-50"
                      >
                        <div className="p-2">
                          <motion.button whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => handleToolSelect('study_guide')} className="w-full text-left p-3 rounded-lg hover:bg-muted/50">
                            <div className="font-medium text-sm">Study Guide</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Structured guide with key topics, questions, and outcomes.</div>
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => handleToolSelect('smart_summary')} className="w-full text-left p-3 rounded-lg hover:bg-muted/50">
                            <div className="font-medium text-sm">Smart Summary</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Concise and well-structured summary of core ideas.</div>
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => handleToolSelect('smart_notes')} className="w-full text-left p-3 rounded-lg hover:bg-muted/50">
                            <div className="font-medium text-sm">Smart Notes</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Bullet notes with definitions, examples, and takeaways.</div>
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.98 }} onClick={() => handleToolSelect('flashcards')} className="w-full text-left p-3 rounded-lg hover:bg-muted/50">
                            <div className="font-medium text-sm">Flashcards</div>
                            <div className="text-xs text-muted-foreground mt-0.5">Q&A cards that reinforce key concepts.</div>
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>⇧ + ⏎ for new line</span>
              </div>
            </div>
            
            {/* Text Input Area */}
            <div className="relative p-4">
              <textarea
                ref={textareaRef}
                data-chat-input
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled || isSending}
                className="w-full resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed pr-16"
                style={{ 
                  height: textareaHeight,
                  minHeight: MIN_HEIGHT,
                  maxHeight: MAX_HEIGHT,
                  lineHeight: `${LINE_HEIGHT}px`
                }}
                rows={1}
              />
            
              {/* Action Buttons */}
              <div className="absolute right-2 top-2 flex items-center gap-2">
                {/* Clear Button */}
                <AnimatePresence>
                  {inputValue && !disabled && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClear}
                      className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors"
                      title="Clear input"
                    >
                      <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Send Button */}
                <motion.button
                  whileHover={canSend ? { scale: 1.05, y: -1 } : {}}
                  whileTap={canSend ? { scale: 0.95 } : {}}
                  onClick={handleSendMessage}
                  disabled={!canSend}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    canSend
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl hover:shadow-primary/25 dark:from-teal-600 dark:to-teal-700 dark:text-white dark:hover:from-teal-700 dark:hover:to-teal-800'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                  title={isSending ? 'Sending...' : 'Send message'}
                >
                  {isSending ? (
                    <motion.svg
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </motion.svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                    </svg>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {(showCharacterCount || isSending || disabled) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mt-4 px-2"
          >
            <div className="flex items-center gap-3">
              {/* Status Indicator */}
              {(isSending || disabled) && (
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isSending ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {isSending ? 'AI is thinking...' : 'Disabled'}
                  </span>
                </div>
              )}
            </div>

            {/* Character Count */}
            {showCharacterCount && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className={`text-xs font-medium transition-colors ${
                  isOverLimit ? 'text-red-500' : 'text-muted-foreground'
                }`}>
                  {inputValue.length}{maxLength ? `/${maxLength}` : ''}
                </span>
                {isOverLimit && (
                  <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.865-.833-2.635 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
})

ChatInput.displayName = 'ChatInput'
