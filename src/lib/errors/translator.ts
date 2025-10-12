import type { ErrorInput, ErrorContext, TranslatedError, UserFacingError, ErrorCategory } from './types'

const DEFAULT_AUTO_RETRY_DELAYS = [15000, 30000, 60000]

const iconByCategory: Record<ErrorCategory, UserFacingError['icon']> = {
  authentication: 'lock',
  'rate-limit': 'clock',
  'model-overload': 'robot',
  network: 'wifi',
  validation: 'pencil',
  safety: 'shield',
  'document-processing': 'doc',
  'study-tool': 'book',
  database: 'database',
  unknown: 'warning'
}

function normalizeMessage(error: ErrorInput): { message: string; status?: number; code?: string } {
  if (typeof error === 'string') {
    return { message: error }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  if (typeof error === 'object' && error) {
    const message =
      (typeof error.message === 'string' && error.message) ||
      (typeof error.error === 'string' && error.error) ||
      'Unexpected error occurred'

    const status = typeof error.status === 'number' ? error.status : undefined
    const code = typeof error.code === 'string' ? error.code : undefined

    return { message, status, code }
  }

  return { message: 'Unexpected error occurred' }
}

function createUserError(partial: Omit<UserFacingError, 'id'>): UserFacingError {
  return {
    ...partial,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10)
  }
}

function matchCategory(message: string, context: ErrorContext, status?: number, code?: string): ErrorCategory {
  const normalized = message.toLowerCase()
  const codeLower = code?.toLowerCase()

  if (status === 401 || status === 403 || normalized.includes('unauthorized') || normalized.includes('invalid session') || normalized.includes('jwt') || codeLower === 'auth') {
    return 'authentication'
  }

  if (status === 429 || normalized.includes('too many requests') || normalized.includes('rate limit') || normalized.includes('quota') || codeLower === 'rate_limit') {
    return 'rate-limit'
  }

  if (status === 503 || normalized.includes('overloaded') || normalized.includes('service unavailable') || normalized.includes('busy') || normalized.includes('capacity') || codeLower === 'model_overloaded') {
    return 'model-overload'
  }

  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('timeout') || normalized.includes('etimedout') || normalized.includes('connection')) {
    return 'network'
  }

  if (normalized.includes('invalid') || normalized.includes('too long') || normalized.includes('format')) {
    if (context.source === 'chat' && normalized.includes('safety')) {
      return 'safety'
    }
    return 'validation'
  }

  if (context.source === 'chat' && (normalized.includes('safety') || normalized.includes('blocked') || normalized.includes('policy'))) {
    return 'safety'
  }

  if (context.source === 'document-upload') {
    if (normalized.includes('parse') || normalized.includes('unsupported') || normalized.includes('password') || normalized.includes('large') || normalized.includes('corrupt')) {
      return 'document-processing'
    }
  }

  if (context.source === 'study-tools') {
    if (normalized.includes('context') || normalized.includes('generation') || normalized.includes('timeout')) {
      return 'study-tool'
    }
  }

  if (normalized.includes('database') || normalized.includes('storage') || normalized.includes('supabase')) {
    return 'database'
  }

  return 'unknown'
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function buildError(category: ErrorCategory, _message: string, _context: ErrorContext): TranslatedError {
  switch (category) {
    case 'authentication':
      return {
        userError: createUserError({
          category,
          severity: 'error',
          title: 'Session Expired',
          message: 'Your session has expired. Please sign in again to continue.',
          icon: iconByCategory[category],
          actions: [
            { id: 'signin', label: 'Sign In Again', variant: 'primary', intent: 'signin', icon: 'lock' },
            { id: 'support', label: 'Contact Support', variant: 'ghost', intent: 'support', icon: 'support' }
          ]
        }),
        isRetryable: false,
        shouldLogout: true,
        shouldRedirectToLogin: true
      }

    case 'rate-limit':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'Taking a Quick Break',
          message: 'You are sending messages very quickly. Please wait a moment before trying again.',
          icon: iconByCategory[category],
          actions: [
            { id: 'countdown', label: 'Auto Retry Soon', variant: 'secondary', intent: 'retry', auto: true },
            { id: 'support', label: 'Report Issue', variant: 'ghost', intent: 'support', icon: 'support' }
          ],
          autoBehavior: {
            type: 'countdown',
            countdownSeconds: 30
          },
          metadata: { disableInput: true }
        }),
        isRetryable: true,
        retryAfterMs: 30000
      }

    case 'model-overload':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'AI Momentarily Busy',
          message: 'Our AI is handling many requests. We are retrying for you automatically.',
          icon: iconByCategory[category],
          actions: [
            { id: 'cancel', label: 'Cancel & Try Later', variant: 'ghost', intent: 'dismiss' }
          ],
          autoBehavior: {
            type: 'auto-retry',
            delayMs: DEFAULT_AUTO_RETRY_DELAYS[0],
            attempts: 1,
            maxAttempts: 3
          }
        }),
        isRetryable: true,
        retryAfterMs: DEFAULT_AUTO_RETRY_DELAYS[0]
      }

    case 'network':
      return {
        userError: createUserError({
          category,
          severity: 'error',
          title: 'Connection Issue',
          message: 'We could not reach our servers. Please check your internet connection and try again.',
          icon: iconByCategory[category],
          actions: [
            { id: 'retry', label: 'Retry', variant: 'primary', intent: 'retry', icon: 'refresh' },
            { id: 'support', label: 'Still Need Help?', variant: 'ghost', intent: 'support', icon: 'support' }
          ]
        }),
        isRetryable: true,
        retryAfterMs: 5000
      }

    case 'validation':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'Message Too Long',
          message: 'Please keep messages under 2,000 characters and try again.',
          icon: iconByCategory[category],
          actions: [
            { id: 'edit', label: 'Edit Message', variant: 'primary', intent: 'dismiss' }
          ]
        }),
        isRetryable: false
      }

    case 'safety':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'Content Not Suitable',
          message: 'Your message could not be processed. Please rephrase and try again.',
          icon: iconByCategory[category],
          actions: [
            { id: 'rephrase', label: 'Try Different Wording', variant: 'primary', intent: 'dismiss' }
          ]
        }),
        isRetryable: false
      }

    case 'document-processing':
      return {
        userError: createUserError({
          category,
          severity: 'error',
          title: 'Document Issue',
          message: 'We could not process this document. It may be corrupted, password-protected, or too large.',
          icon: iconByCategory[category],
          actions: [
            { id: 'upload', label: 'Try Different File', variant: 'primary', intent: 'upload', icon: 'upload' },
            { id: 'support', label: 'Contact Support', variant: 'ghost', intent: 'support', icon: 'support' }
          ],
          details: 'Try re-saving the PDF, remove password protection, or ensure the file is under 100 MB.'
        }),
        isRetryable: false
      }

    case 'study-tool':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'Generation Issue',
          message: 'We were unable to generate this study tool right now. We will attempt another approach.',
          icon: iconByCategory[category],
          actions: [
            { id: 'retry', label: 'Try Again', variant: 'primary', intent: 'retry', icon: 'refresh' },
            { id: 'smaller', label: 'Use Smaller Section', variant: 'secondary', intent: 'open', icon: 'book' }
          ],
          details: 'Large documents might take longer. Consider selecting a smaller section to generate focused materials.'
        }),
        isRetryable: true,
        retryAfterMs: DEFAULT_AUTO_RETRY_DELAYS[0]
      }

    case 'database':
      return {
        userError: createUserError({
          category,
          severity: 'warning',
          title: 'Save Issue',
          message: 'We could not save your latest changes. Your content is still here—please retry in a moment.',
          icon: iconByCategory[category],
          actions: [
            { id: 'retry', label: 'Retry Save', variant: 'primary', intent: 'retry', icon: 'refresh' },
            { id: 'export', label: 'Export Backup', variant: 'secondary', intent: 'contact', icon: 'upload' }
          ]
        }),
        isRetryable: true,
        retryAfterMs: DEFAULT_AUTO_RETRY_DELAYS[0]
      }

    case 'unknown':
    default:
      return {
        userError: createUserError({
          category: 'unknown',
          severity: 'error',
          title: 'Something Went Wrong',
          message: 'We hit an unexpected error. Please try again or contact support if it persists.',
          icon: iconByCategory.unknown,
          actions: [
            { id: 'retry', label: 'Try Again', variant: 'primary', intent: 'retry', icon: 'refresh' },
            { id: 'support', label: 'Report Issue', variant: 'ghost', intent: 'support', icon: 'support' }
          ]
        }),
        isRetryable: true,
        retryAfterMs: DEFAULT_AUTO_RETRY_DELAYS[0]
      }
  }
}

export function translateError(error: ErrorInput, context: ErrorContext): TranslatedError {
  const normalized = normalizeMessage(error)
  const category = matchCategory(normalized.message, context, normalized.status, normalized.code)
  return buildError(category, normalized.message, context)
}

export function getNextAutoRetryDelay(attempt: number): number {
  return DEFAULT_AUTO_RETRY_DELAYS[Math.min(attempt, DEFAULT_AUTO_RETRY_DELAYS.length - 1)]
}
