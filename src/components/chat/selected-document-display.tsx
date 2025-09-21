'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText } from 'lucide-react'

interface DocumentProgress {
  percentage: number
  message: string
  phase: string
}

interface SelectedDocumentDisplayProps {
  document?: {
    id: string
    title: string
    size?: number
    processing_status?: string
  } | null
  onRemove?: () => void
}

export const SelectedDocumentDisplay: React.FC<SelectedDocumentDisplayProps> = ({
  document,
  onRemove
}) => {
  const [progress, setProgress] = useState<DocumentProgress>({ percentage: 0, message: '', phase: '' })

  // Poll for progress when document is processing
  useEffect(() => {
    if (!document || document.processing_status !== 'processing') {
      setProgress({ percentage: 0, message: '', phase: '' })
      return
    }

    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/documents/${document.id}/status`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.progress) {
            setProgress(data.progress)
          }
        }
      } catch (error) {
        console.error('Error fetching document progress:', error)
      }
    }

    // Initial fetch
    fetchProgress()

    // Poll every 1 second for smoother progress updates
    const interval = setInterval(fetchProgress, 1000)

    return () => clearInterval(interval)
  }, [document?.id, document?.processing_status])

  if (!document) return null

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1024) {
      return `${kb.toFixed(1)} KB`
    }
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
      case 'processing':
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
      case 'failed':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
      default:
        return 'bg-muted/50 border-border'
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'processing':
        return (
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {Math.round(progress.percentage)}%
          </span>
        )
      case 'failed':
        return (
          <div className="w-2 h-2 bg-red-500 rounded-full" />
        )
      case 'completed':
        return (
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        )
      default:
        return null
    }
  }

  return (
    <div className="px-6 pb-2 max-w-4xl mx-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`
            flex items-center gap-2 p-2 rounded-lg border shadow-sm
            ${getStatusColor(document.processing_status)}
            hover:shadow-md transition-all duration-200
          `}
        >
          {/* PDF Icon */}
          <div className="flex-shrink-0 w-7 h-7 bg-red-500 rounded-md flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-white" />
          </div>

          {/* Document Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-xs text-foreground truncate">
                {document.title}
              </p>
              {getStatusIcon(document.processing_status)}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">PDF</span>
              {document.size && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {formatFileSize(document.size)}
                  </span>
                </>
              )}
              {document.processing_status && (
                <>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {document.processing_status === 'completed' ? 'Ready' :
                     document.processing_status === 'processing' ? (progress.message || 'Processing...') :
                     document.processing_status === 'failed' ? 'Failed' :
                     document.processing_status}
                  </span>
                </>
              )}
            </div>

            {/* Progress Bar for Processing */}
            {document.processing_status === 'processing' && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                  <span>{progress.message || 'Processing...'}</span>
                </div>
                <div className="w-full bg-blue-100 dark:bg-blue-800/30 rounded-full h-1">
                  <motion.div
                    className="h-1 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress.percentage || 0}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Remove Button */}
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRemove}
              className="flex-shrink-0 w-5 h-5 rounded-full bg-background/80 hover:bg-background border border-border/50 hover:border-border flex items-center justify-center transition-all duration-200"
              title="Remove document"
            >
              <X className="w-2.5 h-2.5 text-muted-foreground hover:text-foreground" />
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}