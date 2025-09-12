'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { StreamingIndicatorProps } from './types'

export const StreamingIndicator: React.FC<StreamingIndicatorProps> = React.memo(({
  isVisible,
  text = 'AI is thinking...'
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex justify-start mb-4"
        >
          <div className="flex items-start gap-3 max-w-[85%]">
            {/* AI Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
              <motion.svg 
                className="w-4 h-4 text-muted-foreground" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </motion.svg>
            </div>

            {/* Typing Bubble */}
            <div className="bg-muted rounded-2xl rounded-bl-sm border border-border px-4 py-3 min-w-[120px]">
              <div className="flex items-center space-x-3">
                {/* Animated Dots */}
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 1, 0.4]
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut'
                      }}
                      className="w-2 h-2 bg-primary rounded-full"
                    />
                  ))}
                </div>

                {/* Status Text */}
                <motion.span 
                  className="text-xs text-muted-foreground font-medium"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {text}
                </motion.span>
              </div>

              {/* Subtle pulse effect on the whole bubble */}
              <motion.div
                className="absolute inset-0 rounded-2xl rounded-bl-sm bg-primary/5 pointer-events-none"
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

StreamingIndicator.displayName = 'StreamingIndicator'