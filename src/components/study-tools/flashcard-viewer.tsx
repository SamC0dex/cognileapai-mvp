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
  const [isAnimating, setIsAnimating] = React.useState(false)

  // Animation controls
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-25, 25])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0])

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  // Navigation functions with Tinder-style animations
  const goToNext = React.useCallback(() => {
    if (currentIndex < flashcards.length - 1 && !isAnimating) {
      setIsAnimating(true)
      setCardDirection('right')
      setShowAnswer(false)

      // Animate current card out to the left
      x.set(-400)

      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        x.set(400) // Start next card from right

        setTimeout(() => {
          x.set(0) // Animate to center
          setIsAnimating(false)
          setCardDirection(null)
        }, 50)
      }, 200)
    }
  }, [currentIndex, flashcards.length, x, isAnimating])

  const goToPrevious = React.useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true)
      setCardDirection('left')
      setShowAnswer(false)

      // Animate current card out to the right
      x.set(400)

      setTimeout(() => {
        setCurrentIndex(prev => prev - 1)
        x.set(-400) // Start previous card from left

        setTimeout(() => {
          x.set(0) // Animate to center
          setIsAnimating(false)
          setCardDirection(null)
        }, 50)
      }, 200)
    }
  }, [currentIndex, x, isAnimating])

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
      <div className={cn(
        "flex-1 flex items-center justify-center relative overflow-hidden",
        isFullscreen ? "p-12 bg-gradient-to-br from-background via-background to-muted/20" : "p-4"
      )}>
        {/* Background Cards (for depth effect) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Next card preview */}
          {currentIndex < flashcards.length - 1 && (
            <motion.div
              className={cn(
                "absolute bg-card border border-border rounded-2xl shadow-lg opacity-20 scale-95 rotate-2",
                isFullscreen ? "w-[28rem] h-[36rem]" : "w-72 h-[24.96rem]"
              )}
              style={{ zIndex: 1 }}
            />
          )}
        </div>

        {/* Main Card */}
        <motion.div
          className={cn(
            "relative",
            isFullscreen ? "w-[28rem] h-[36rem]" : "w-72 h-[24.96rem]"
          )}
          style={{ zIndex: 10 }}
          animate={{
            scale: isAnimating ? 0.98 : 1,
            rotateY: isAnimating ? 5 : 0
          }}
          transition={{
            duration: 0.25,
            ease: "easeInOut"
          }}
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
                  "w-full h-full rounded-2xl border-2 flex flex-col justify-center items-center text-center shadow-2xl",
                  "bg-gradient-to-br from-background to-background/95 backdrop-blur-sm",
                  "border-border hover:border-primary/30 transition-all duration-300",
                  showAnswer && "border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-background dark:from-green-900/20",
                  isFullscreen ? "p-12" : "p-8" // More padding in fullscreen
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
                        <h2 className={cn(
                          "font-medium text-foreground leading-relaxed max-w-full break-words text-center",
                          isFullscreen ? "text-2xl" : "text-lg" // Larger text in fullscreen
                        )}>
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
                          className={cn(
                            "bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-lg",
                            isFullscreen ? "px-8 py-4 text-lg" : "px-4 py-2 text-sm" // Larger button in fullscreen
                          )}
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
                          <h3 className={cn(
                            "font-medium text-foreground mb-4 text-center",
                            isFullscreen ? "text-xl" : "text-base" // Larger text in fullscreen
                          )}>
                            {currentCard.question}
                          </h3>
                          <div className={cn(
                            "text-muted-foreground leading-relaxed",
                            isFullscreen ? "text-sm" : "text-xs" // Smaller text in study tools section
                          )}>
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
                          className={cn(
                            "rounded-xl font-medium border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20",
                            isFullscreen ? "px-8 py-4 text-lg" : "px-4 py-2 text-sm" // Larger button in fullscreen
                          )}
                        >
                          <MessageSquare className={cn("mr-2", isFullscreen ? "w-5 h-5" : "w-3 h-3")} />
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
              className={cn(
                "absolute p-3 rounded-full bg-background/80 border border-border hover:bg-accent shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110",
                isFullscreen ? "left-4" : "left-2" // Adjust positioning for study tools section
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className={cn("text-foreground", isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
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
              className={cn(
                "absolute p-3 rounded-full bg-background/80 border border-border hover:bg-accent shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-110",
                isFullscreen ? "right-4" : "right-2" // Adjust positioning for study tools section
              )}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className={cn("text-foreground", isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className={cn(
        "border-t border-border bg-background/95 backdrop-blur-sm",
        isFullscreen ? "p-6" : "p-3" // More padding in fullscreen
      )}>
        {/* Content Feedback Buttons - Only in fullscreen */}
        {isFullscreen && (
          <div className="flex items-center justify-center gap-6 mb-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                👍
              </motion.div>
              <span className="font-medium">Good content</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-6 py-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              >
                👎
              </motion.div>
              <span className="font-medium">Bad content</span>
            </motion.button>
          </div>
        )}

        <div className={cn(
          "flex items-center justify-between",
          isFullscreen ? "mb-6" : "mb-3"
        )}>
          <Button
            variant="outline"
            size="sm"
            onClick={restart}
            className="flex items-center gap-2 hover:bg-accent"
          >
            <RotateCcw className={cn(isFullscreen ? "w-4 h-4" : "w-3 h-3")} />
          </Button>

          <span className={cn(
            "font-medium text-foreground",
            isFullscreen ? "text-base" : "text-xs" // Larger text in fullscreen
          )}>
            {currentIndex + 1} / {flashcards.length} cards
          </span>

          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Progress Bar */}
        <div className={cn(
          "w-full bg-muted rounded-full overflow-hidden",
          isFullscreen ? "h-3" : "h-1.5" // Thicker in fullscreen
        )}>
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