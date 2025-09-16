'use client'

import React from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Button } from '@/components/ui'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Maximize2,
  Minimize2,
  MessageSquare,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { FlashcardEntry, FlashcardProgress } from '@/types/flashcards'

interface FlashcardViewerProps {
  flashcards: FlashcardEntry[]
  title: string
  onClose?: () => void
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
  className?: string
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  flashcards,
  title,
  onClose,
  isFullscreen = false,
  onToggleFullscreen,
  className
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [showAnswer, setShowAnswer] = React.useState(false)
  const [cardDirection, setCardDirection] = React.useState<'left' | 'right' | null>(null)

  // Animation controls
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  // Navigation functions
  const goToNext = React.useCallback(() => {
    if (currentIndex < flashcards.length - 1) {
      setCardDirection('right')
      setCurrentIndex(prev => prev + 1)
      setShowAnswer(false)
      x.set(0)
    }
  }, [currentIndex, flashcards.length, x])

  const goToPrevious = React.useCallback(() => {
    if (currentIndex > 0) {
      setCardDirection('left')
      setCurrentIndex(prev => prev - 1)
      setShowAnswer(false)
      x.set(0)
    }
  }, [currentIndex, x])

  const restart = React.useCallback(() => {
    setCurrentIndex(0)
    setShowAnswer(false)
    setCardDirection(null)
    x.set(0)
  }, [x])

  const toggleAnswer = React.useCallback(() => {
    setShowAnswer(prev => !prev)
  }, [])

  // Swipe handlers
  const handleDragEnd = React.useCallback((event: any, info: PanInfo) => {
    const threshold = 100

    if (info.offset.x > threshold && currentIndex > 0) {
      // Swipe right - go to previous
      goToPrevious()
    } else if (info.offset.x < -threshold && currentIndex < flashcards.length - 1) {
      // Swipe left - go to next
      goToNext()
    } else {
      // Snap back
      x.set(0)
    }
  }, [currentIndex, flashcards.length, goToNext, goToPrevious, x])

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToPrevious()
          break
        case 'ArrowRight':
          e.preventDefault()
          goToNext()
          break
        case ' ':
        case 'Enter':
          e.preventDefault()
          toggleAnswer()
          break
        case 'r':
        case 'R':
          e.preventDefault()
          restart()
          break
        case 'Escape':
          if (isFullscreen && onToggleFullscreen) {
            onToggleFullscreen()
          } else if (onClose) {
            onClose()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToNext, goToPrevious, toggleAnswer, restart, isFullscreen, onToggleFullscreen, onClose])

  if (!currentCard) return null

  return (
    <div className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "fixed inset-0 z-50" : "h-full",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-foreground truncate max-w-xs">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Based on {flashcards.length} sources
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              className="w-8 h-8 rounded-lg"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-lg"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Card Area */}
      <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden">
        {/* Background Cards (for depth effect) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Next card preview */}
          {currentIndex < flashcards.length - 1 && (
            <motion.div
              className="absolute w-80 h-96 bg-card border border-border rounded-2xl shadow-lg opacity-20 scale-95 rotate-2"
              style={{ zIndex: 1 }}
            />
          )}
        </div>

        {/* Main Card */}
        <motion.div
          className="relative w-80 h-96 cursor-grab active:cursor-grabbing"
          style={{ x, rotate, opacity, zIndex: 10 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          whileTap={{ cursor: 'grabbing' }}
        >
          <div className="relative w-full h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${showAnswer}`}
                initial={{
                  rotateY: cardDirection === 'left' ? -90 : cardDirection === 'right' ? 90 : showAnswer ? -90 : 0
                }}
                animate={{ rotateY: 0 }}
                exit={{
                  rotateY: cardDirection === 'left' ? 90 : cardDirection === 'right' ? -90 : showAnswer ? 90 : 0
                }}
                transition={{
                  duration: 0.3,
                  ease: 'easeInOut',
                  type: 'spring',
                  stiffness: 300,
                  damping: 30
                }}
                className="absolute inset-0 w-full h-full backface-hidden"
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={cn(
                  "w-full h-full rounded-2xl border-2 p-8 flex flex-col justify-center items-center text-center shadow-xl",
                  "bg-gradient-to-br from-background to-background/95 backdrop-blur-sm",
                  "border-border hover:border-primary/30 transition-colors duration-200",
                  showAnswer && "border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-background dark:from-green-900/20"
                )}>
                  {!showAnswer ? (
                    /* Question Side */
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 flex items-center justify-center"
                      >
                        <h2 className="text-xl font-medium text-foreground leading-relaxed max-w-full break-words">
                          {currentCard.question}
                        </h2>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-auto"
                      >
                        <Button
                          onClick={toggleAnswer}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                        >
                          See answer
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    /* Answer Side */
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 flex flex-col justify-center space-y-6"
                      >
                        <div className="text-center">
                          <h3 className="text-lg font-medium text-foreground mb-4">
                            {currentCard.question}
                          </h3>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {currentCard.answer}
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-auto"
                      >
                        <Button
                          onClick={toggleAnswer}
                          variant="outline"
                          className="px-6 py-3 rounded-xl font-medium border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Explain
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Navigation Arrows */}
        <AnimatePresence mode="wait">
          {currentIndex > 0 && (
            <motion.button
              key="prev-arrow"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={goToPrevious}
              className="absolute left-4 p-3 rounded-full bg-background/80 border border-border hover:bg-accent shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {currentIndex < flashcards.length - 1 && (
            <motion.button
              key="next-arrow"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={goToNext}
              className="absolute right-4 p-3 rounded-full bg-background/80 border border-border hover:bg-accent shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={restart}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <span className="text-sm font-medium text-foreground">
            {currentIndex + 1} / {flashcards.length} cards
          </span>

          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}