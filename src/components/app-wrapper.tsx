'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useExtensionBlocker } from '@/hooks/use-extension-blocker'
import { preloadEmbeddingPipeline } from '@/lib/embeddings'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  useExtensionBlocker()

  const pathname = usePathname()
  const hasQueuedPreload = useRef(false)

  // ✅ Only warm up embeddings on routes that need them
  useEffect(() => {
    if (typeof window === 'undefined') return

    const shouldPreload = pathname?.startsWith('/chat') || pathname?.startsWith('/dashboard') || pathname?.startsWith('/test-document-chat')

    if (!shouldPreload || hasQueuedPreload.current) {
      return
    }

    hasQueuedPreload.current = true

    let idleHandle: number | null = null
    let timeoutId: number | null = null

    const schedulePreload = () => {
      const runPreload = () => {
        void preloadEmbeddingPipeline()
      }

      const win = window as typeof window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
        cancelIdleCallback?: (handle: number) => void
      }

      if (win.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(() => runPreload(), { timeout: 2000 })
      } else {
        timeoutId = window.setTimeout(runPreload, 1200)
      }
    }

    schedulePreload()

    return () => {
      const win = window as typeof window & { cancelIdleCallback?: (handle: number) => void }
      if (idleHandle !== null && win.cancelIdleCallback) {
        win.cancelIdleCallback(idleHandle)
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [pathname])

  return <>{children}</>
}