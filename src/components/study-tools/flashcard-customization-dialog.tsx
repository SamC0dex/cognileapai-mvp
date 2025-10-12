'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui'
import { X, Sparkles, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlashcardOptions, FLASHCARD_COUNTS, FLASHCARD_DIFFICULTIES } from '@/types/flashcards'

interface FlashcardCustomizationDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (options: FlashcardOptions) => void
  isGenerating?: boolean
}

export const FlashcardCustomizationDialog: React.FC<FlashcardCustomizationDialogProps> = ({
  isOpen,
  onClose,
  onGenerate,
  isGenerating = false
}) => {
  const [numberOfCards, setNumberOfCards] = React.useState<'fewer' | 'standard' | 'more'>('standard')
  const [difficulty, setDifficulty] = React.useState<'easy' | 'medium' | 'hard'>('medium')
  const [customInstructions, setCustomInstructions] = React.useState('')

  const handleGenerate = () => {
    onGenerate({
      numberOfCards,
      difficulty,
      customInstructions: customInstructions.trim() || undefined
    })
  }

  const handleClose = () => {
    if (!isGenerating) {
      onClose()
    }
  }

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setNumberOfCards('standard')
      setDifficulty('medium')
      setCustomInstructions('')
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[500] flex items-center justify-center p-4 sm:p-6 lg:p-8"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-3xl xl:max-w-4xl max-h-[90vh] overflow-y-auto mx-auto relative z-[510]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-gradient-to-r from-green-50/50 to-transparent dark:from-green-900/20">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-xl bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
              </motion.div>
              <h2 className="text-xl font-semibold text-foreground">
                Generate Flashcards
              </h2>
            </div>
            {!isGenerating && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="rounded-lg hover:bg-accent/50"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Number of Cards */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Number of Cards</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(FLASHCARD_COUNTS) as Array<keyof typeof FLASHCARD_COUNTS>).map((option) => {
                  const count = FLASHCARD_COUNTS[option]
                  const isSelected = numberOfCards === option

                  return (
                    <motion.button
                      key={option}
                      type="button"
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all duration-200 text-left",
                        isSelected
                          ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 shadow-md"
                          : "bg-background border-border hover:border-green-200 dark:hover:border-green-800 hover:bg-green-50/50 dark:hover:bg-green-900/10"
                      )}
                      onClick={() => setNumberOfCards(option)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isGenerating}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm capitalize text-foreground">
                          {option}
                          {option === 'standard' && ' (Default)'}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-green-600 dark:text-green-400"
                          >
                            <Check className="w-4 h-4" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {count.min}-{count.max} cards
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {count.description}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Level of Difficulty */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Level of Difficulty</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(FLASHCARD_DIFFICULTIES) as Array<keyof typeof FLASHCARD_DIFFICULTIES>).map((level) => {
                  const config = FLASHCARD_DIFFICULTIES[level]
                  const isSelected = difficulty === level

                  return (
                    <motion.button
                      key={level}
                      type="button"
                      className={cn(
                        "relative p-4 rounded-lg border-2 transition-all duration-200 text-left",
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md"
                          : "bg-background border-border hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                      )}
                      onClick={() => setDifficulty(level)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isGenerating}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm capitalize text-foreground">
                          {level}
                          {level === 'medium' && ' (Default)'}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="text-blue-600 dark:text-blue-400"
                          >
                            <Check className="w-4 h-4" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {config.description}
                      </p>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Custom Instructions</h3>
              <div className="relative">
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder={
                    "Things to try:\n" +
                    "• The flashcards must be restricted to a specific source (e.g. the article about Italy)\n" +
                    "• The flashcards must focus on a specific topic like Newton's second law\n" +
                    "• The card fronts must be short (1-5 words) for memorization"
                  }
                  disabled={isGenerating}
                  className={cn(
                    "w-full min-h-[100px] p-4 rounded-lg border border-border bg-background",
                    "placeholder:text-muted-foreground text-sm resize-none",
                    "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50",
                    "transition-all duration-200",
                    isGenerating && "opacity-50 cursor-not-allowed"
                  )}
                  maxLength={500}
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {customInstructions.length}/500
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <motion.div
              className="flex justify-end pt-4 border-t border-border"
            >
              <motion.button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className={cn(
                  "px-8 py-3 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600",
                  "text-white font-medium rounded-lg shadow-lg hover:shadow-xl",
                  "transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center gap-2"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isGenerating ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </motion.div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}