'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Zap, RefreshCw } from 'lucide-react'
import type { ConversationTokens } from '@/lib/token-manager'

interface ContextWarningProps {
  conversationTokens: ConversationTokens | null
  contextWarning: string | null
  onStartNewChat?: () => void
}

export function ContextWarning({ conversationTokens, contextWarning, onStartNewChat }: ContextWarningProps) {
  if (!conversationTokens || !contextWarning) {
    return null
  }

  const { totalTokens, warningLevel } = conversationTokens
  const percentage = Math.round((totalTokens / 200000) * 100) // Based on practical limit

  // Define warning styles based on level
  const warningStyles = {
    caution: {
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-800',
      textColor: 'text-amber-800 dark:text-amber-200',
      iconColor: 'text-amber-600 dark:text-amber-400',
      icon: Zap
    },
    warning: {
      bgColor: 'bg-orange-50 dark:bg-orange-950/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      textColor: 'text-orange-800 dark:text-orange-200',
      iconColor: 'text-orange-600 dark:text-orange-400',
      icon: AlertTriangle
    },
    critical: {
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800',
      textColor: 'text-red-800 dark:text-red-200',
      iconColor: 'text-red-600 dark:text-red-400',
      icon: AlertTriangle
    }
  }

  const currentStyle = warningStyles[warningLevel] || warningStyles.caution
  const IconComponent = currentStyle.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={`
          mx-4 mb-4 p-4 rounded-lg border
          ${currentStyle.bgColor}
          ${currentStyle.borderColor}
          ${currentStyle.textColor}
          shadow-sm backdrop-blur-sm
        `}
      >
        <div className="flex items-start gap-3">
          <IconComponent className={`w-5 h-5 mt-0.5 ${currentStyle.iconColor} flex-shrink-0`} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Context Window Usage: {percentage}%
                </p>
                <p className="text-xs opacity-80">
                  {contextWarning}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs opacity-60">
                  <span>{totalTokens.toLocaleString()} tokens</span>
                  <span>•</span>
                  <span>Conversation length</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-shrink-0 w-16">
                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className={`
                      h-2 rounded-full
                      ${warningLevel === 'critical' ? 'bg-red-500' :
                        warningLevel === 'warning' ? 'bg-orange-500' :
                        'bg-amber-500'
                      }
                    `}
                  />
                </div>
              </div>
            </div>

            {/* Action button for critical level */}
            {warningLevel === 'critical' && onStartNewChat && (
              <motion.button
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                onClick={onStartNewChat}
                className={`
                  mt-3 inline-flex items-center gap-1.5 px-3 py-1.5
                  text-xs font-medium rounded-md transition-colors
                  bg-red-100 dark:bg-red-900/30
                  text-red-700 dark:text-red-300
                  hover:bg-red-200 dark:hover:bg-red-900/50
                  border border-red-200 dark:border-red-800
                `}
              >
                <RefreshCw className="w-3 h-3" />
                Start New Chat
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ContextWarning