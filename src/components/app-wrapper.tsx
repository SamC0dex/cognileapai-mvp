'use client'

import { useEffect } from 'react'
import { useExtensionBlocker } from '@/hooks/use-extension-blocker'
import { preloadEmbeddingPipeline } from '@/lib/embeddings'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  useExtensionBlocker()

  // ✅ PRELOAD heavy components for better performance
  useEffect(() => {
    // Preload embedding pipeline in background for faster first use
    preloadEmbeddingPipeline()
  }, [])

  return <>{children}</>
}