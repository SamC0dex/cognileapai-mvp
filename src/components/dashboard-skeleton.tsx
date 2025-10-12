'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface DashboardSkeletonProps {
  count?: number
  viewMode?: 'grid' | 'list'
}

/**
 * Professional loading skeleton with shimmer animation
 * Matches the actual study tool card layout for seamless transition
 */
export function DashboardSkeleton({ count = 6, viewMode = 'grid' }: DashboardSkeletonProps) {
  return (
    <div className="space-y-4">
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, index) => (
            <SkeletonCard key={index} delay={index * 0.05} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, index) => (
            <SkeletonListItem key={index} delay={index * 0.03} />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Skeleton card for grid view
 */
function SkeletonCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="p-4 rounded-lg border-2 border-border/50 bg-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <div className="skeleton-shimmer w-9 h-9 rounded-lg flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title skeleton */}
          <div className="skeleton-shimmer h-4 w-3/4 rounded" />

          {/* Metadata skeleton */}
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer h-3 w-3 rounded" />
            <div className="skeleton-shimmer h-3 w-24 rounded" />
            <div className="skeleton-shimmer h-4 w-12 rounded" />
          </div>
        </div>

        {/* External link icon skeleton */}
        <div className="skeleton-shimmer w-4 h-4 rounded flex-shrink-0" />
      </div>
    </div>
  )
}

/**
 * Skeleton list item for list view
 */
function SkeletonListItem({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="p-3 rounded-lg border border-border/50 bg-card"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex items-start gap-3">
        {/* Icon skeleton */}
        <div className="skeleton-shimmer w-7 h-7 rounded-lg flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title skeleton */}
          <div className="skeleton-shimmer h-3.5 w-2/3 rounded" />

          {/* Metadata skeleton */}
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer h-3 w-3 rounded" />
            <div className="skeleton-shimmer h-3 w-32 rounded" />
            <div className="skeleton-shimmer h-3 w-12 rounded" />
          </div>
        </div>

        {/* External link icon skeleton */}
        <div className="skeleton-shimmer w-3 h-3 rounded flex-shrink-0" />
      </div>
    </div>
  )
}

/**
 * Inline skeleton for smaller loading states
 */
export function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("skeleton-shimmer rounded", className)} />
  )
}
