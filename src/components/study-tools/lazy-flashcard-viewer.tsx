'use client'

import React, { lazy, Suspense } from 'react'
// Simple skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className || ''}`} />
)
import { FlashcardsStackIcon } from '@/components/icons/flashcards-stack-icon'
import { Card, CardContent } from '@/components/ui'
import { FlashcardEntry } from '@/types/flashcards'

// ✅ LAZY LOAD FLASHCARD VIEWER (440 lines)
const FlashcardViewer = lazy(async () => {
  const flashcardModule = await import('./flashcard-viewer')
  return { default: flashcardModule.FlashcardViewer }
})

// Lightweight skeleton for flashcard viewer
function FlashcardViewerSkeleton() {
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header skeleton */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <FlashcardsStackIcon className="w-6 h-6 text-primary animate-pulse" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-2xl aspect-[3/2] shadow-lg">
            <CardContent className="h-full flex flex-col items-center justify-center p-8 space-y-4">
              {/* Card type indicator */}
              <div className="w-full flex justify-center mb-4">
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              {/* Main content area */}
              <div className="text-center space-y-4 w-full">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-5/6 mx-auto" />
              </div>

              {/* Action area */}
              <div className="mt-8 space-y-2 w-full">
                <Skeleton className="h-4 w-1/3 mx-auto" />
                <div className="flex gap-2 justify-center">
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-10 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom controls skeleton */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-20" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-9 w-9 rounded" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface LazyFlashcardViewerProps {
  flashcards: FlashcardEntry[]
  title: string
  onClose?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  className?: string
}

export function LazyFlashcardViewer(props: LazyFlashcardViewerProps) {
  return (
    <Suspense fallback={<FlashcardViewerSkeleton />}>
      <FlashcardViewer {...props} />
    </Suspense>
  )
}

// Export skeleton for reuse
export { FlashcardViewerSkeleton }
