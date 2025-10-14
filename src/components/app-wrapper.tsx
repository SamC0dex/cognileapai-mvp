'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useExtensionBlocker } from '@/hooks/use-extension-blocker'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  useExtensionBlocker()

  const pathname = usePathname()
  const hasQueuedPreload = useRef(false)

  // ✅ Only warm up embeddings on routes that need them
  // CRITICAL: Use dynamic import to prevent blocking layout.js compilation
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
      const runPreload = async () => {
        try {
          // Dynamic import to avoid blocking layout.js chunk loading
          const { preloadEmbeddingPipeline } = await import('@/lib/embeddings')
          void preloadEmbeddingPipeline()
        } catch (error) {
          console.warn('[AppWrapper] Failed to preload embeddings:', error)
        }
      }

      const win = window as typeof window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
        cancelIdleCallback?: (handle: number) => void
      }

      if (win.requestIdleCallback) {
        idleHandle = win.requestIdleCallback(() => void runPreload(), { timeout: 2000 })
      } else {
        timeoutId = window.setTimeout(() => void runPreload(), 1200)
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