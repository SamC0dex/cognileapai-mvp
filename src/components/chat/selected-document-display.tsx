'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText } from 'lucide-react'

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
          <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />
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
                     document.processing_status === 'processing' ? 'Processing...' :
                     document.processing_status === 'failed' ? 'Failed' :
                     document.processing_status}
                  </span>
                </>
              )}
            </div>
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