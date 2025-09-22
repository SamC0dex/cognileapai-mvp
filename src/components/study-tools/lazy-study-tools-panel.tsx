'use client'

import React, { lazy, Suspense } from 'react'
// Simple skeleton component for loading state
const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-muted ${className || ''}`} />
)
import { ChevronRight, Sparkles, BookOpen, FileText, PenTool, Zap } from 'lucide-react'

// Import the SelectedDocument type
interface SelectedDocument {
  id: string
  title: string
  size?: number
  processing_status?: string
}

// ✅ LAZY LOAD THE HEAVY COMPONENT (1778 lines!)
const StudyToolsPanel = lazy(async () => {
  const module = await import('./study-tools-panel')
  return { default: module.StudyToolsPanel }
})

// Lightweight skeleton component for loading state
function StudyToolsPanelSkeleton() {
  return (
    <div className="h-full flex flex-col bg-background border-r border-border/50 w-12 hover:w-80 transition-all duration-200 group">
      {/* Collapsed state skeleton */}
      <div className="p-2 space-y-2">
        <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
        <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
        <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
        <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Expanded state skeleton (shown on hover) */}
      <div className="hidden group-hover:block p-4 space-y-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="space-y-2">
          {[
            { icon: BookOpen, color: 'text-blue-500' },
            { icon: FileText, color: 'text-green-500' },
            { icon: PenTool, color: 'text-purple-500' },
            { icon: Zap, color: 'text-amber-500' }
          ].map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
              <item.icon className={`w-4 h-4 ${item.color}`} />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2 w-32" />
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          ))}
        </div>

        <div className="border-t border-border/50 pt-3">
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  )
}

interface LazyStudyToolsPanelProps {
  documentId?: string
  conversationId?: string
  selectedDocuments?: SelectedDocument[]
  primaryDocument?: SelectedDocument | null
  hasMessages?: boolean
}

export function LazyStudyToolsPanel({
  documentId,
  conversationId,
  selectedDocuments = [],
  primaryDocument = null,
  hasMessages = false
}: LazyStudyToolsPanelProps) {
  return (
    <Suspense fallback={<StudyToolsPanelSkeleton />}>
      <StudyToolsPanel
        documentId={documentId}
        conversationId={conversationId}
        selectedDocuments={selectedDocuments}
        primaryDocument={primaryDocument}
        hasMessages={hasMessages}
      />
    </Suspense>
  )
}

// Export the skeleton separately for reuse
export { StudyToolsPanelSkeleton }
