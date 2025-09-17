/**
 * Beautiful Error Management UI Components
 * Provides elegant error handling with retry functionality
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Clock, AlertTriangle, CheckCircle, XCircle, Wifi, WifiOff } from 'lucide-react'
import { Button } from '../ui'
import { retryManager, type RetryAttempt, subscribeToRetries, cancelRetry } from '@/lib/retry-manager'

// Error Toast Component
interface ErrorToastProps {
  error: Error
  onRetry?: () => void
  onDismiss?: () => void
  allowRetry?: boolean
  retryAttemptId?: string
}

export function ErrorToast({ error, onRetry, onDismiss, allowRetry = true, retryAttemptId }: ErrorToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    if (!onRetry) return
    setIsRetrying(true)
    try {
      await onRetry()
      setIsVisible(false)
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDismiss = () => {
    if (retryAttemptId) {
      cancelRetry(retryAttemptId)
    }
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Operation Failed
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {error.message}
            </p>

            {allowRetry && (
              <div className="mt-3 flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="text-xs"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Try Again
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Dismiss
                </Button>
              </div>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Retry Status Panel Component
export function RetryStatusPanel() {
  const [attempts, setAttempts] = useState<RetryAttempt[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToRetries((newAttempts) => {
      setAttempts(newAttempts)
      const activeAttempts = newAttempts.filter(a => ['pending', 'retrying'].includes(a.status))
      setIsVisible(activeAttempts.length > 0)
    })

    return unsubscribe
  }, [])

  const activeAttempts = attempts.filter(a => ['pending', 'retrying'].includes(a.status))

  if (!isVisible || activeAttempts.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed top-4 right-4 z-40 max-w-sm"
    >
      <div className="bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Background Retries Active
          </h3>
        </div>

        <div className="space-y-2">
          {activeAttempts.slice(0, 3).map((attempt) => (
            <RetryAttemptItem key={attempt.id} attempt={attempt} />
          ))}

          {activeAttempts.length > 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              +{activeAttempts.length - 3} more retries pending...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// Individual Retry Attempt Item
interface RetryAttemptItemProps {
  attempt: RetryAttempt
}

function RetryAttemptItem({ attempt }: RetryAttemptItemProps) {
  const getTaskDisplayName = (taskType: string) => {
    switch (taskType) {
      case 'chat': return 'Chat Message'
      case 'study-tool-generation': return 'Study Tool'
      case 'document-processing': return 'Document'
      default: return taskType
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'retrying':
        return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />
      case 'pending':
        return <Clock className="h-3 w-3 text-amber-500" />
      case 'success':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'failed':
        return <XCircle className="h-3 w-3 text-red-500" />
      default:
        return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  const timeUntilRetry = attempt.nextRetryAt.getTime() - Date.now()
  const isRetryingSoon = timeUntilRetry > 0 && timeUntilRetry < 60000 // Less than 1 minute

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
      <div className="flex items-center space-x-2">
        {getStatusIcon(attempt.status)}
        <span className="text-gray-700 dark:text-gray-300">
          {getTaskDisplayName(attempt.taskType)}
        </span>
      </div>

      <div className="flex items-center space-x-2">
        <span className="text-gray-500 dark:text-gray-400">
          {attempt.currentAttempt}/{attempt.maxRetries}
        </span>

        {attempt.status === 'pending' && isRetryingSoon && (
          <span className="text-amber-600 dark:text-amber-400">
            {Math.ceil(timeUntilRetry / 1000)}s
          </span>
        )}

        <button
          onClick={() => cancelRetry(attempt.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Cancel retry"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

// Network Status Indicator
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [showOfflineToast, setShowOfflineToast] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineToast(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineToast(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline && !showOfflineToast) return null

  return (
    <AnimatePresence>
      {showOfflineToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-orange-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span className="text-sm font-medium">
              You're offline. Retries will resume when connection is restored.
            </span>
          </div>
        </motion.div>
      )}

      {isOnline && showOfflineToast && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          onAnimationComplete={() => {
            setTimeout(() => setShowOfflineToast(false), 3000)
          }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">
              Back online! Resuming retries...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Error Boundary with Retry
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  retry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback
      return <Fallback error={this.state.error} retry={this.retry} />
    }

    return this.props.children
  }
}

// Default Error Fallback Component
function DefaultErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-red-50 dark:bg-red-900/20 rounded-full p-3 mb-4">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-md">
        {error.message}
      </p>

      <Button onClick={retry} className="min-w-[120px]">
        <RefreshCw className="h-4 w-4 mr-2" />
        Try Again
      </Button>
    </div>
  )
}

// Hook for using error handling in components
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  const handleError = (error: Error, options?: { showToast?: boolean; allowRetry?: boolean }) => {
    console.error('Error handled:', error)
    setError(error)

    if (options?.showToast !== false) {
      // You could integrate with a toast system here
    }
  }

  const clearError = () => setError(null)

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null
  }
}