"use client"

import { motion, useInView, AnimatePresence } from "framer-motion"
import { FileText, Sparkles, Brain, Zap, CheckCircle2, Loader2, MessageSquare } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { SectionBackground } from "./animated-background"

/**
 * Demo Showcase Section - Interactive AI Processing Visualization
 *
 * Shows a real-time simulation of the AI processing pipeline:
 * Document Upload → AI Analysis → Study Materials Generation → Chat Interaction
 */

type ProcessingStage = "upload" | "analyze" | "generate" | "complete"

const PROCESSING_STAGES = [
  {
    id: "upload",
    icon: <FileText className="h-5 w-5" />,
    title: "Document Upload",
    description: "Parsing PDF structure and extracting content",
    duration: 1500,
    color: "from-blue-500 to-cyan-400",
  },
  {
    id: "analyze",
    icon: <Brain className="h-5 w-5" />,
    title: "AI Analysis",
    description: "Generating semantic embeddings and building knowledge graph",
    duration: 2000,
    color: "from-purple-500 to-pink-400",
  },
  {
    id: "generate",
    icon: <Sparkles className="h-5 w-5" />,
    title: "Content Generation",
    description: "Creating study materials with Gemini 2.5 Pro",
    duration: 2500,
    color: "from-amber-500 to-orange-400",
  },
  {
    id: "complete",
    icon: <CheckCircle2 className="h-5 w-5" />,
    title: "Ready to Learn",
    description: "All study materials generated and ready",
    duration: 1000,
    color: "from-teal-500 to-emerald-400",
  },
]

const GENERATED_MATERIALS = [
  { type: "Summary", emoji: "📝", count: "1 doc" },
  { type: "Study Guide", emoji: "📚", count: "4 sections" },
  { type: "Smart Notes", emoji: "✍️", count: "12 concepts" },
  { type: "Flashcards", emoji: "🎯", count: "24 cards" },
]

function ProcessingStageIndicator({
  stage,
  isActive,
  isCompleted,
  index,
}: {
  stage: typeof PROCESSING_STAGES[number]
  isActive: boolean
  isCompleted: boolean
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative flex items-start gap-4"
    >
      {/* Icon */}
      <motion.div
        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-lg ${
          isCompleted
            ? `bg-gradient-to-br ${stage.color}`
            : isActive
              ? `animate-pulse bg-gradient-to-br ${stage.color}`
              : "bg-muted"
        }`}
        animate={{
          scale: isActive ? [1, 1.05, 1] : 1,
        }}
        transition={{
          scale: { duration: 1, repeat: Infinity },
        }}
      >
        {isActive ? <Loader2 className="h-5 w-5 animate-spin" /> : stage.icon}
      </motion.div>

      {/* Content */}
      <div className="flex-1">
        <h4 className={`font-semibold ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
          {stage.title}
        </h4>
        <p className="text-sm text-muted-foreground">{stage.description}</p>

        {/* Progress bar */}
        {isActive && (
          <motion.div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full bg-gradient-to-r ${stage.color}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: stage.duration / 1000, ease: "linear" }}
            />
          </motion.div>
        )}
      </div>

      {/* Checkmark */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            <CheckCircle2 className="h-5 w-5 text-teal-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function InteractiveDemoShowcase() {
  const [currentStage, setCurrentStage] = useState<number>(0)
  const [isRunning, setIsRunning] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-100px" })

  // Reset and restart demo when coming into view
  useEffect(() => {
    if (!isInView) {
      setIsRunning(false)
      return
    }

    // Only restart if not already on final stage or if scrolling back
    if (!hasCompleted || !isRunning) {
      const startDelay = setTimeout(() => {
        setCurrentStage(0)
        setIsRunning(true)
        setHasCompleted(false)
      }, 500)

      return () => clearTimeout(startDelay)
    }
  }, [isInView])

  // Progress through stages
  useEffect(() => {
    if (!isRunning || currentStage >= PROCESSING_STAGES.length) return

    const stageTimer = setTimeout(() => {
      if (currentStage < PROCESSING_STAGES.length - 1) {
        setCurrentStage((prev) => prev + 1)
      } else {
        // Mark as completed and STOP - don't loop
        setHasCompleted(true)
        setIsRunning(false)
      }
    }, PROCESSING_STAGES[currentStage].duration)

    return () => clearTimeout(stageTimer)
  }, [currentStage, isRunning])

  return (
    <div ref={ref} className="relative mx-auto max-w-6xl">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Processing Stages */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-8 backdrop-blur-sm shadow-xl dark:shadow-none"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold">AI Processing Pipeline</h3>
            <p className="text-sm text-muted-foreground">Real-time transformation of your document</p>
          </div>

          <div className="space-y-6">
            {PROCESSING_STAGES.map((stage, index) => (
              <ProcessingStageIndicator
                key={stage.id}
                stage={stage}
                isActive={currentStage === index}
                isCompleted={currentStage > index}
                index={index}
              />
            ))}
          </div>

          {/* Animated particles */}
          {isRunning && (
            <>
              {[...Array(10)].map((_, i) => (
                <motion.div
                  key={i}
                  className="pointer-events-none absolute h-1 w-1 rounded-full bg-primary/30"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0.3, 0.6, 0.3],
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </>
          )}
        </motion.div>

        {/* Right: Generated Materials */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 p-8 backdrop-blur-sm shadow-xl dark:shadow-none"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold">Generated Study Materials</h3>
            <p className="text-sm text-muted-foreground">Comprehensive learning resources ready in seconds</p>
          </div>

          {/* Generated materials grid */}
          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
              {currentStage >= 2 &&
                GENERATED_MATERIALS.map((material, index) => (
                  <motion.div
                    key={material.type}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      delay: index * 0.1,
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                    className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-4 transition-all hover:border-primary/50 shadow-md hover:shadow-xl dark:shadow-none"
                  >
                    <div className="mb-2 text-2xl">{material.emoji}</div>
                    <h4 className="mb-1 font-semibold">{material.type}</h4>
                    <p className="text-xs text-muted-foreground">{material.count}</p>

                    {/* Glow on hover */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/5 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>

          {/* Chat preview */}
          <AnimatePresence>
            {currentStage >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span>Ready for intelligent Q&A</span>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="rounded-lg bg-muted p-3 text-sm"
                >
                  <p className="text-muted-foreground">What are the key concepts in this document?</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 }}
                  className="ml-auto max-w-[90%] rounded-lg border bg-card p-3 text-sm shadow-md dark:shadow-sm"
                >
                  <p className="text-sm">
                    Based on the document analysis, the key concepts include: neural networks, transfer learning, and
                    model optimization...
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success indicator */}
          <AnimatePresence>
            {currentStage >= 3 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2, type: "spring" }}
                className="mt-6 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500/10 to-emerald-500/10 py-3 text-sm font-medium text-teal-600 dark:text-teal-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Processing complete in &lt; 60 seconds</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default function DemoShowcaseSection() {
  return (
    <section id="demo" className="relative overflow-hidden py-20 sm:py-32">
      <SectionBackground />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm shadow-sm dark:shadow-none"
          >
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Live Processing Demo</span>
          </motion.div>

          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Watch{" "}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent animate-gradient" style={{ backgroundSize: "200% auto" }}>
              AI in Action
            </span>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Experience the full pipeline: from document upload to comprehensive study materials generation. This is the
            power of production-grade AI processing.
          </p>
        </motion.div>

        {/* Interactive demo */}
        <div className="mt-16">
          <InteractiveDemoShowcase />
        </div>

        {/* Tech stack footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-medium backdrop-blur-sm shadow-md dark:shadow-none">
            <Brain className="h-4 w-4" />
            <span>
              Powered by <span className="font-semibold text-primary">Gemini 2.5 Pro</span> •{" "}
              <span className="font-semibold text-primary">Transformers.js</span> •{" "}
              <span className="font-semibold text-primary">Real-time Streaming</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
