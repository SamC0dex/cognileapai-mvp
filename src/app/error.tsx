'use client'

import { useEffect } from 'react'
import { RootErrorFallback } from '@/components/error-management/root-error-fallback'

export default function GlobalError({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App Error]', error)
  }, [error])

  return <RootErrorFallback error={error} retry={reset} />
}
