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
      isFullscreen ? "h-full" : "h-full", // Remove fixed positioning for fullscreen
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
              {flashcards.length} flashcards
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
        isFullscreen ? "py-4 px-8" : "p-4" // Reduced vertical padding for fullscreen
      )}>
        {/* Background Cards (for depth effect) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Next card preview */}
          {currentIndex < flashcards.length - 1 && (
            <motion.div
              className={cn(
                "absolute bg-card border border-border rounded-2xl shadow-lg opacity-20 scale-95 rotate-2",
                isFullscreen ? "w-80 h-[32rem]" : "w-72 h-[24.96rem]"
              )}
              style={{ zIndex: 1 }}
            />
          )}
        </div>

        {/* Main Card */}
        <motion.div
          className={cn(
            "relative",
            isFullscreen ? "w-96 h-[36rem]" : "w-72 h-[24.96rem]" // Better proportions for fullscreen
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
                  "w-full h-full rounded-2xl border-2 flex flex-col justify-center items-center text-center shadow-xl",
                  "bg-gradient-to-br from-background to-background/95",
                  "border-border hover:border-primary/30 transition-all duration-300",
                  showAnswer && "border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50/50 to-background dark:from-green-900/20",
                  isFullscreen ? "p-8" : "p-6" // Balanced padding
                )}>
                  {!showAnswer ? (
                    /* Question Side */
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 flex items-center justify-center cursor-pointer"
                        onClick={toggleAnswer}
                      >
                        <h2 className={cn(
                          "font-medium text-foreground leading-relaxed max-w-full break-words text-center",
                          isFullscreen ? "text-2xl" : "text-xl" // Increased by 2 from text-xl/text-lg
                        )}>
                          {currentCard.question}
                        </h2>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-auto cursor-pointer"
                        onClick={toggleAnswer}
                      >
                        <div className={cn(
                          "text-center py-3 px-6 text-muted-foreground font-medium transition-all duration-200",
                          "drop-shadow-md hover:drop-shadow-lg",
                          isFullscreen ? "text-lg" : "text-base" // Increased by 2 from text-lg/text-sm
                        )}>
                          See answer
                        </div>
                      </motion.div>
                    </>
                  ) : (
                    /* Answer Side */
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex-1 flex items-center justify-center cursor-pointer"
                        onClick={toggleAnswer}
                      >
                        <div className={cn(
                          "text-foreground leading-relaxed text-center max-w-full break-words",
                          isFullscreen ? "text-2xl" : "text-xl" // Same size as question, increased by 2
                        )}>
                          {currentCard.answer}
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-auto cursor-pointer"
                        onClick={toggleAnswer}
                      >
                        <div className={cn(
                          "text-center py-3 px-6 text-green-600 dark:text-green-400 font-medium transition-all duration-200",
                          "drop-shadow-md hover:drop-shadow-lg flex items-center justify-center gap-2",
                          isFullscreen ? "text-lg" : "text-base" // Increased by 2 from text-lg/text-sm
                        )}>
                          <MessageSquare className={cn(isFullscreen ? "w-5 h-5" : "w-4 h-4")} />
                          See question
                        </div>
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
        isFullscreen ? "px-8 py-3" : "p-3" // Reduced vertical padding for fullscreen
      )}>

        {/* Content Feedback Buttons - REMOVED as per user request */}

        {/* Card Counter */}
        <div className={cn(
          "flex items-center justify-center",
          isFullscreen ? "mb-2" : "mb-1.5" // Reduced by 50%
        )}>
          <span className={cn(
            "font-medium text-foreground",
            isFullscreen ? "text-base" : "text-xs"
          )}>
            {currentIndex + 1} / {flashcards.length} cards
          </span>
        </div>

        {/* Progress Bar with Restart Button on the left */}
        <div className={cn(
          "flex items-center gap-3",
          isFullscreen ? "justify-center" : "justify-start"
        )}>
          {/* Restart button to the left of progress bar */}
          <Button
            variant="outline"
            size="sm"
            onClick={restart}
            className="flex items-center gap-2 hover:bg-accent flex-shrink-0"
          >
            <RotateCcw className={cn(isFullscreen ? "w-4 h-4" : "w-3 h-3")} />
          </Button>

          {/* Progress Bar */}
          <div className={cn(
            "bg-muted rounded-full overflow-hidden",
            isFullscreen ? "w-96 h-3" : "w-full h-1.5"
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
    </div>
  )
}