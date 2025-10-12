export type ErrorCategory =
  | 'authentication'
  | 'rate-limit'
  | 'model-overload'
  | 'network'
  | 'validation'
  | 'safety'
  | 'document-processing'
  | 'study-tool'
  | 'database'
  | 'unknown'

export type ErrorSeverity = 'info' | 'warning' | 'error'

export interface ErrorAction {
  id: string
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  intent?: 'retry' | 'reload' | 'signin' | 'contact' | 'support' | 'dismiss' | 'upload' | 'open'
  href?: string
  icon?: 'refresh' | 'lock' | 'contact' | 'upload' | 'retry' | 'home' | 'support' | 'book'
  auto?: boolean
}

export interface AutoBehavior {
  type: 'redirect' | 'countdown' | 'auto-retry'
  delayMs?: number
  attempts?: number
  maxAttempts?: number
  countdownSeconds?: number
}

export interface UserFacingError {
  id: string
  category: ErrorCategory
  severity: ErrorSeverity
  title: string
  message: string
  icon: 'lock' | 'clock' | 'robot' | 'wifi' | 'pencil' | 'doc' | 'database' | 'warning' | 'shield' | 'book'
  details?: string
  actions: ErrorAction[]
  autoBehavior?: AutoBehavior
  metadata?: Record<string, unknown>
}

export interface ErrorContext {
  source: 'chat' | 'study-tools' | 'document-upload' | 'auth' | 'api' | 'storage'
  operation?: string
  statusCode?: number
  errorCode?: string
  rawMessage?: string
  retryCount?: number
  maxRetries?: number
  payload?: Record<string, unknown>
}

export interface TranslatedError {
  userError: UserFacingError
  isRetryable: boolean
  retryAfterMs?: number
  shouldLogout?: boolean
  shouldRedirectToLogin?: boolean
}

export type ErrorInput =
  | Error
  | string
  | {
      message?: string
      status?: number
      code?: string
      error?: unknown
      [key: string]: unknown
    }
