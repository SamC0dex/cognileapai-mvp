import type { ErrorContext, UserFacingError } from './types'

export function logError(error: unknown, context: ErrorContext, friendly?: UserFacingError) {
  const payload = {
    source: context.source,
    operation: context.operation,
    statusCode: context.statusCode,
    errorCode: context.errorCode,
    retryCount: context.retryCount,
    message: friendly?.message,
    title: friendly?.title,
    category: friendly?.category,
    severity: friendly?.severity,
    rawMessage: context.rawMessage,
    payload: context.payload,
    timestamp: new Date().toISOString()
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', payload, error)
    return
  }

  // TODO: wire to an external service (Sentry, Logtail, etc.)
  console.error('[Error]', payload)
}
