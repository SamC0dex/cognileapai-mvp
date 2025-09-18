/**
 * Token Management System for Gemini Models
 * Provides accurate token counting, conversation tracking, and context window management
 */

// Token estimation constants based on Gemini API documentation
export const TOKEN_ESTIMATION = {
  CHARS_PER_TOKEN: 4, // ~4 characters per token for Gemini models
  WORDS_PER_TOKEN: 0.75, // ~0.75 words per token for English text
  BUFFER_PERCENTAGE: 0.1, // 10% safety buffer
} as const

// Context window limits (2025 specs)
export const CONTEXT_LIMITS = {
  // Gemini 2.5 model limits
  GEMINI_INPUT_MAX: 1048576, // 1M+ tokens
  GEMINI_OUTPUT_MAX: 65536,  // 64K+ tokens

  // Practical limits for optimal quality
  PRACTICAL_INPUT_MAX: 200000, // 200K tokens (research-backed optimal performance)
  PRACTICAL_OUTPUT_MAX: 8192,  // 8K tokens for responses

  // Warning thresholds
  WARNING_THRESHOLD: 150000,   // 150K tokens - warn user
  CRITICAL_THRESHOLD: 180000,  // 180K tokens - suggest new chat
} as const

export interface TokenCount {
  estimated: number
  exact?: number
  confidence: 'high' | 'medium' | 'low'
  method: 'estimation' | 'api_count' | 'cached'
  timestamp: Date
}

export interface ConversationTokens {
  conversationId: string
  totalTokens: number
  messageTokens: number
  documentTokens: number
  systemTokens: number
  lastUpdated: Date
  warningLevel: 'none' | 'caution' | 'warning' | 'critical'
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  tokenCount?: TokenCount
}

/**
 * Fast token estimation based on character count
 */
export function estimateTokensFromText(text: string): TokenCount {
  if (!text || text.length === 0) {
    return {
      estimated: 0,
      confidence: 'high',
      method: 'estimation',
      timestamp: new Date()
    }
  }

  // Clean text for more accurate estimation
  const cleanText = text.trim()
  const charCount = cleanText.length
  const wordCount = cleanText.split(/\s+/).filter(word => word.length > 0).length

  // Use multiple estimation methods and average
  const charBasedTokens = Math.ceil(charCount / TOKEN_ESTIMATION.CHARS_PER_TOKEN)
  const wordBasedTokens = Math.ceil(wordCount / TOKEN_ESTIMATION.WORDS_PER_TOKEN)

  // Weight character-based estimation more heavily for accuracy
  const estimated = Math.round((charBasedTokens * 0.7) + (wordBasedTokens * 0.3))

  // Determine confidence based on text characteristics
  let confidence: 'high' | 'medium' | 'low' = 'high'
  if (text.includes('```') || text.includes('<') || text.includes('{')) {
    confidence = 'medium' // Code or structured content may have different token density
  }
  if (charCount > 50000) {
    confidence = 'medium' // Very large text may have estimation drift
  }

  return {
    estimated,
    confidence,
    method: 'estimation',
    timestamp: new Date()
  }
}

/**
 * Estimate tokens for multiple messages (conversation context)
 */
export function estimateConversationTokens(messages: Message[]): ConversationTokens {
  let totalTokens = 0
  let messageTokens = 0
  let documentTokens = 0
  let systemTokens = 0

  for (const message of messages) {
    const tokenCount = message.tokenCount || estimateTokensFromText(message.content)
    const tokens = tokenCount.estimated

    totalTokens += tokens

    switch (message.role) {
      case 'user':
      case 'assistant':
        messageTokens += tokens
        break
      case 'system':
        // System messages often contain document context
        if (message.content.includes('You have access to the following content')) {
          documentTokens += tokens
        } else {
          systemTokens += tokens
        }
        break
    }
  }

  // Determine warning level
  let warningLevel: 'none' | 'caution' | 'warning' | 'critical' = 'none'
  if (totalTokens > CONTEXT_LIMITS.CRITICAL_THRESHOLD) {
    warningLevel = 'critical'
  } else if (totalTokens > CONTEXT_LIMITS.WARNING_THRESHOLD) {
    warningLevel = 'warning'
  } else if (totalTokens > CONTEXT_LIMITS.WARNING_THRESHOLD * 0.8) {
    warningLevel = 'caution'
  }

  return {
    conversationId: '', // Will be set by caller
    totalTokens,
    messageTokens,
    documentTokens,
    systemTokens,
    lastUpdated: new Date(),
    warningLevel
  }
}

/**
 * Check if adding new content would exceed context limits
 */
export function canAddContent(
  currentTokens: number,
  newContentTokens: number,
  limit: number = CONTEXT_LIMITS.PRACTICAL_INPUT_MAX
): {
  canAdd: boolean
  remaining: number
  wouldExceed: boolean
  suggestedAction?: string
} {
  const total = currentTokens + newContentTokens
  const remaining = limit - currentTokens
  const wouldExceed = total > limit

  let suggestedAction: string | undefined
  if (wouldExceed) {
    if (total > CONTEXT_LIMITS.CRITICAL_THRESHOLD) {
      suggestedAction = 'Start a new conversation for optimal performance'
    } else if (total > CONTEXT_LIMITS.WARNING_THRESHOLD) {
      suggestedAction = 'Consider starting a new conversation soon'
    } else {
      suggestedAction = 'Monitor conversation length'
    }
  }

  return {
    canAdd: !wouldExceed,
    remaining: Math.max(0, remaining),
    wouldExceed,
    suggestedAction
  }
}

/**
 * Generate user-friendly warning messages
 */
export function getContextWarningMessage(tokens: ConversationTokens): string | null {
  const { totalTokens, warningLevel } = tokens
  const percentage = Math.round((totalTokens / CONTEXT_LIMITS.PRACTICAL_INPUT_MAX) * 100)

  switch (warningLevel) {
    case 'caution':
      return `Conversation is ${percentage}% of optimal context window. Consider starting a new chat if performance degrades.`

    case 'warning':
      return `⚠️ Conversation is ${percentage}% of optimal context window. Starting a new chat is recommended for best AI responses.`

    case 'critical':
      return `🚨 Conversation has exceeded optimal context window (${totalTokens.toLocaleString()} tokens). Please start a new chat for optimal performance.`

    default:
      return null
  }
}

/**
 * Optimize conversation by summarizing old messages
 */
export function optimizeConversationLength(
  messages: Message[],
  targetTokens: number = CONTEXT_LIMITS.WARNING_THRESHOLD
): {
  optimizedMessages: Message[]
  summaryMessage?: Message
  tokensRemoved: number
  tokensKept: number
} {
  const conversationTokens = estimateConversationTokens(messages)

  if (conversationTokens.totalTokens <= targetTokens) {
    return {
      optimizedMessages: messages,
      tokensRemoved: 0,
      tokensKept: conversationTokens.totalTokens
    }
  }

  // Keep the most recent messages that fit within target
  const recentMessages: Message[] = []
  let currentTokens = 0

  // Work backwards from most recent
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    const messageTokens = estimateTokensFromText(message.content).estimated

    if (currentTokens + messageTokens <= targetTokens) {
      recentMessages.unshift(message)
      currentTokens += messageTokens
    } else {
      break
    }
  }

  // Create summary of removed messages
  const removedMessages = messages.slice(0, messages.length - recentMessages.length)
  const tokensRemoved = conversationTokens.totalTokens - currentTokens

  let summaryMessage: Message | undefined
  if (removedMessages.length > 0) {
    const summaryContent = `[Previous conversation summary: ${removedMessages.length} messages covering earlier topics in this conversation]`

    summaryMessage = {
      id: `summary_${Date.now()}`,
      role: 'system',
      content: summaryContent,
      timestamp: new Date(),
      tokenCount: estimateTokensFromText(summaryContent)
    }
  }

  const optimizedMessages = summaryMessage
    ? [summaryMessage, ...recentMessages]
    : recentMessages

  return {
    optimizedMessages,
    summaryMessage,
    tokensRemoved,
    tokensKept: currentTokens
  }
}

/**
 * Smart document context sizing based on conversation length
 */
export function getOptimalDocumentContextSize(conversationTokens: number): number {
  const remaining = CONTEXT_LIMITS.PRACTICAL_INPUT_MAX - conversationTokens
  const buffer = remaining * TOKEN_ESTIMATION.BUFFER_PERCENTAGE

  // Reserve space for user message and AI response
  const reservedForResponse = 4000 // ~1000 word response
  const reservedForUserMessage = 1000 // ~250 word user message

  const availableForDocument = remaining - buffer - reservedForResponse - reservedForUserMessage

  // Ensure minimum useful context
  return Math.max(10000, Math.min(availableForDocument, CONTEXT_LIMITS.PRACTICAL_INPUT_MAX * 0.7))
}

/**
 * Export utility functions for easy access
 */
export const TokenManager = {
  estimate: estimateTokensFromText,
  estimateConversation: estimateConversationTokens,
  canAdd: canAddContent,
  getWarning: getContextWarningMessage,
  optimize: optimizeConversationLength,
  getOptimalDocumentSize: getOptimalDocumentContextSize,

  // Constants for external use
  LIMITS: CONTEXT_LIMITS,
  ESTIMATION: TOKEN_ESTIMATION
} as const