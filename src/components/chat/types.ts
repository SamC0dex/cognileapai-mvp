export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  citations?: Citation[]
  metadata?: {
    model?: string
    tokens?: number
    temperature?: number
  }
}

export type ChatMessage = Message

export interface Citation {
  id: string
  text: string
  page?: number
  section?: string
  confidence?: number
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
  autoFocus?: boolean
  selectedDocuments?: Array<{
    id: string
    title: string
    size?: number
    processing_status?: string
  }>
  urlSelectedDocument?: {
    id: string
    title: string
    size?: number
    processing_status?: string
  } | null
  onRemoveDocument?: (documentId: string) => void
}

export interface ChatMessageProps {
  message: ChatMessage
  onCitationClick?: (citation: Citation) => void
  showAvatar?: boolean
  showTimestamp?: boolean
}

export interface StreamingIndicatorProps {
  isVisible: boolean
  text?: string
}

export interface ChatContainerProps {
  messages: ChatMessage[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
  isEmpty?: boolean
  suggestedQuestions?: string[]
  disabled?: boolean
}

export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  isLoading: boolean
  error?: string
}