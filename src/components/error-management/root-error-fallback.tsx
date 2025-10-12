'use client'

import React, { useMemo, useCallback } from 'react'
import { translateError } from '@/lib/errors/translator'
import { ActionableErrorPanel } from './actionable-error-panel'
import type { ErrorAction } from '@/lib/errors/types'

export function RootErrorFallback({ error, retry }: { error: Error; retry: () => void }) {
  const translated = useMemo(() => translateError(error, {
    source: 'api',
    operation: 'render',
    rawMessage: error.message,
    payload: {
      component: 'RootLayout'
    }
  }), [error])

  const handleAction = useCallback((action: ErrorAction) => {
    switch (action.intent) {
      case 'retry':
        retry()
        break
      case 'reload':
        if (typeof window !== 'undefined') {
          window.location.reload()
        }
        break
      case 'support':
        if (typeof window !== 'undefined') {
          window.open('mailto:support@cognileap.ai?subject=App%20Issue', '_blank')
        }
        break
      case 'signin':
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        break
      default:
        retry()
        break
    }
  }, [retry])

  return (
    <div className="max-w-xl mx-auto p-6">
      <ActionableErrorPanel error={translated.userError} onAction={handleAction} />
    </div>
  )
}
