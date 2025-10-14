"use client"

import { motion, useInView, AnimatePresence } from "framer-motion"
import { Sparkles, Brain, Zap, Check, CheckCircle2 } from "lucide-react"
import { useRef, useState, useEffect } from "react"
import { SectionBackground } from "./animated-background"

/**
 * How It Works Section - The Processing Chamber
 *
 * An immersive, multi-layered visualization showing the document's journey
 * through the AI system with depth, particle effects, and real transformation
 */

// Data particles that flow through the system
interface Particle {
  id: number
  x: number
  y: number
  targetX: number
  targetY: number
  progress: number
  speed: number
  size: number
}

// Processing stages with visual metadata
const PROCESSING_LAYERS = [
  {
    id: "input",
    label: "Document Input",
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.5)",
  },
  {
    id: "extract",
    label: "Content Extraction",
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.5)",
  },
  {
    id: "analyze",
    label: "AI Analysis",
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.5)",
  },
  {
    id: "generate",
    label: "Material Generation",
    color: "#14b8a6",
    glow: "rgba(20, 184, 166, 0.5)",
  },
]

const AI_PROCESSORS = [
  { name: "Flash Lite", color: "#3b82f6", speed: "150ms", icon: "⚡" },
  { name: "Flash", color: "#8b5cf6", speed: "500ms", icon: "✨" },
  { name: "Pro", color: "#f59e0b", speed: "2s", icon: "🧠" },
]

const OUTPUT_MATERIALS = [
  { type: "Summary", icon: "📝", color: "#3b82f6" },
  { type: "Guide", icon: "📚", color: "#8b5cf6" },
  { type: "Notes", icon: "✍️", color: "#f59e0b" },
  { type: "Cards", icon: "🎯", color: "#14b8a6" },
]

/**
 * The Processing Chamber - Main visualization component
 */
function ProcessingChamber() {
  const [activeStage, setActiveStage] = useState(0)
  const [particles, setParticles] = useState<Particle[]>([])
  const [selectedProcessor, setSelectedProcessor] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [hasBeenOutOfView, setHasBeenOutOfView] = useState(false)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: false, margin: "-100px" })

  // Track when component leaves viewport
  useEffect(() => {
    if (!isInView && hasCompleted) {
      setHasBeenOutOfView(true)
    }
  }, [isInView, hasCompleted])

  // Initialize and restart animation only when coming back into view after being out
  useEffect(() => {
    if (!isInView) {
      return
    }

    // Start initial animation or restart after scrolling away
    if (!hasCompleted || hasBeenOutOfView) {
      const startDelay = setTimeout(() => {
        setActiveStage(0)
        setIsProcessing(true)
        setHasCompleted(false)
        setHasBeenOutOfView(false)
        generateParticles()
      }, 300)

      return () => clearTimeout(startDelay)
    }
  }, [isInView, hasCompleted, hasBeenOutOfView])

  // Progress through stages (faster, no loop)
  useEffect(() => {
    if (!isProcessing) return

    const stageTimer = setTimeout(() => {
      setActiveStage((prev) => {
        if (prev >= PROCESSING_LAYERS.length - 1) {
          setIsProcessing(false)
          setHasCompleted(true)
          return prev
        }
        return prev + 1
      })
    }, 800) // Faster: 800ms instead of 1200ms

    return () => clearTimeout(stageTimer)
  }, [activeStage, isProcessing])

  // Cycle through AI processors (faster, only when processing)
  useEffect(() => {
    if (!isProcessing) return

    const processorTimer = setInterval(() => {
      setSelectedProcessor((prev) => (prev + 1) % AI_PROCESSORS.length)
    }, 700) // Faster: 700ms instead of 1000ms

    return () => clearInterval(processorTimer)
  }, [isProcessing])

  // Generate flowing particles
  const generateParticles = () => {
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      targetX: Math.random() * 100,
      targetY: Math.random() * 100,
      progress: Math.random(),
      speed: 0.3 + Math.random() * 0.7,
      size: 2 + Math.random() * 3,
    }))
    setParticles(newParticles)
  }

  // Animate particles (only while processing, faster)
  useEffect(() => {
    if (!isProcessing || particles.length === 0) return

    const animationFrame = setInterval(() => {
      setParticles((prev) =>
        prev.map((particle) => {
          let newProgress = particle.progress + particle.speed * 0.03 // 50% faster
          let newTargetX = particle.targetX
          let newTargetY = particle.targetY

          if (newProgress >= 1) {
            newProgress = 0
            newTargetX = Math.random() * 100
            newTargetY = Math.random() * 100
          }

          const newX = particle.x + (newTargetX - particle.x) * newProgress
          const newY = particle.y + (newTargetY - particle.y) * newProgress

          return {
            ...particle,
            x: newX,
            y: newY,
            targetX: newTargetX,
            targetY: newTargetY,
            progress: newProgress,
          }
        })
      )
    }, 40) // Faster: 40ms instead of 50ms

    return () => clearInterval(animationFrame)
  }, [isProcessing, particles.length])

  return (
    <div ref={ref} className="relative mx-auto max-w-7xl px-4 sm:px-6">
      {/* Main Processing Chamber */}
      <div className="relative min-h-[500px] sm:min-h-[600px] overflow-hidden rounded-2xl sm:rounded-3xl border border-border/50 bg-gradient-to-b from-card/50 to-card/80 backdrop-blur-sm shadow-2xl dark:shadow-none">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(100, 100, 100, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(100, 100, 100, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Particle system */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: PROCESSING_LAYERS[activeStage]?.color || "#3b82f6",
                boxShadow: `0 0 ${particle.size * 2}px ${PROCESSING_LAYERS[activeStage]?.glow || "rgba(59, 130, 246, 0.5)"}`,
              }}
              animate={{
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              suppressHydrationWarning
            />
          ))}
        </div>

        {/* Processing Layers */}
        <div className="relative grid grid-cols-1 gap-4 p-4 sm:gap-6 sm:p-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8 lg:p-8">
          {PROCESSING_LAYERS.map((layer, index) => {
            const isActive = activeStage === index
            const isCompleted = activeStage > index

            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{
                  opacity: isInView ? 1 : 0,
                  y: isInView ? 0 : 20,
                  scale: isActive ? 1.03 : 1,
                }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="relative"
              >
                {/* Layer card */}
                <div
                  className={`relative overflow-hidden rounded-xl border p-6 transition-all duration-500 ${
                    isActive
                      ? "border-primary/50 bg-primary/10 shadow-2xl shadow-primary/10"
                      : isCompleted
                        ? "border-teal-500/30 bg-teal-500/5 shadow-lg shadow-teal-500/5"
                        : "border-border/30 bg-card/40 shadow-md dark:shadow-none"
                  }`}
                  style={{
                    transform: `perspective(1000px) rotateY(${isActive ? "0deg" : "2deg"})`,
                  }}
                >
                  {/* Animated glow */}
                  {isActive && (
                    <motion.div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background: `radial-gradient(circle at 50% 50%, ${layer.glow} 0%, transparent 70%)`,
                      }}
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}

                  {/* Content */}
                  <div className="relative">
                    <motion.div
                      className="mb-3 text-2xl"
                      animate={{
                        scale: isActive ? [1, 1.2, 1] : 1,
                        rotate: isActive ? [0, 5, -5, 0] : 0,
                      }}
                      transition={{
                        duration: 1,
                        repeat: isActive ? Infinity : 0,
                      }}
                    >
                      {index === 0 && "📄"}
                      {index === 1 && "🔍"}
                      {index === 2 && "🧠"}
                      {index === 3 && "✨"}
                    </motion.div>

                    <h4
                      className="mb-2 text-sm font-semibold"
                      style={{ color: isActive || isCompleted ? layer.color : undefined }}
                    >
                      {layer.label}
                    </h4>

                    {/* Progress indicator */}
                    {isActive && (
                      <div className="mt-3 space-y-1">
                        <div className="h-1 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="h-full"
                            style={{ background: layer.color }}
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.8, ease: "linear" }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground animate-pulse">
                          Processing...
                        </p>
                      </div>
                    )}

                    {/* Completion check */}
                    {isCompleted && (
                      <div className="mt-3 flex items-center gap-1 text-xs text-teal-500">
                        <Check className="h-3 w-3" />
                        <span>Complete</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Connection line to next stage */}
                {index < PROCESSING_LAYERS.length - 1 && (
                  <div className="absolute -right-4 top-1/2 z-10 hidden lg:block">
                    <motion.div
                      className="h-0.5 w-8"
                      style={{
                        background: isCompleted
                          ? `linear-gradient(to right, ${layer.color}, ${PROCESSING_LAYERS[index + 1].color})`
                          : "rgba(100, 100, 100, 0.2)",
                      }}
                      animate={{
                        opacity: isCompleted || isActive ? [0.5, 1, 0.5] : 0.2,
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    />
                    {(isActive || isCompleted) && (
                      <motion.div
                        className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                        style={{ background: layer.color }}
                        animate={{
                          x: [0, 32, 32],
                          opacity: [1, 1, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* AI Processor Units */}
        <div className="relative border-t border-border/30 bg-card/20 p-4 sm:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center justify-center gap-2 px-2">
              <Brain className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-center">Intelligent Model Selection</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
              {AI_PROCESSORS.map((processor, index) => {
                const isSelected = selectedProcessor === index

                return (
                  <motion.div
                    key={processor.name}
                    animate={{
                      scale: isSelected ? 1.05 : 1,
                      opacity: isSelected ? 1 : 0.5,
                    }}
                    transition={{ duration: 0.3 }}
                    className="relative"
                  >
                    <div
                      className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-3 sm:px-4 py-2.5 sm:py-3 transition-all ${
                        isSelected ? "border-primary/50 bg-primary/10 shadow-lg shadow-primary/10" : "border-border/30 bg-card/40 shadow-md dark:shadow-none"
                      }`}
                    >
                      <span className="text-xl sm:text-2xl flex-shrink-0">{processor.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate">{processor.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Zap className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{processor.speed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection glow */}
                    {isSelected && (
                      <motion.div
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        style={{
                          boxShadow: `0 0 20px ${processor.color}`,
                        }}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                        }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Output Materials */}
        <AnimatePresence>
          {activeStage >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="border-t border-border/30 bg-gradient-to-b from-teal-500/5 to-transparent p-8"
            >
              <div className="mx-auto max-w-4xl">
                <div className="mb-6 text-center">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4 text-teal-500" />
                    <span className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      Study Materials Generated
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {OUTPUT_MATERIALS.map((material, index) => (
                    <motion.div
                      key={material.type}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: index * 0.1,
                        duration: 0.3,
                      }}
                      className="group relative overflow-hidden rounded-xl border border-border/30 bg-card/60 p-3 sm:p-4 text-center transition-all hover:border-primary/50 shadow-md hover:shadow-xl dark:shadow-none"
                    >
                      <motion.div
                        className="mb-2 text-2xl sm:text-3xl"
                        animate={{
                          rotate: [0, 5, -5, 0],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      >
                        {material.icon}
                      </motion.div>
                      <div className="text-xs font-medium">{material.type}</div>

                      {/* Hover glow */}
                      <div
                        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
                        style={{
                          background: `radial-gradient(circle at 50% 50%, ${material.color}15 0%, transparent 70%)`,
                        }}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Success message */}
                <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-teal-600 dark:text-teal-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Complete transformation in &lt; 60 seconds</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden py-10 sm:py-16 w-full">
      <SectionBackground />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Behind The Scenes</span>
          </div>

          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            See The{" "}
            <span
              className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent animate-gradient"
              style={{ backgroundSize: "200% auto" }}
            >
              Magic Happen
            </span>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Watch your document transform through our AI processing chamber. Every stage, every decision, visualized in
            real-time.
          </p>
        </motion.div>

        {/* Processing Chamber */}
        <div className="mt-16">
          <ProcessingChamber />
        </div>

        {/* Key features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="mt-12 sm:mt-16 md:mt-20 grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-3"
        >
          {[
            {
              icon: <Brain className="h-6 w-6" />,
              title: "Intelligent Processing",
              desc: "Multi-layered AI analysis with deep document understanding",
              color: "from-blue-500 to-cyan-400",
            },
            {
              icon: <Sparkles className="h-6 w-6" />,
              title: "Real-time Generation",
              desc: "Watch materials being created as processing happens",
              color: "from-purple-500 to-pink-400",
            },
            {
              icon: <Zap className="h-6 w-6" />,
              title: "Optimized Speed",
              desc: "Smart model selection for perfect speed-quality balance",
              color: "from-amber-500 to-orange-400",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 p-6 text-center backdrop-blur-sm transition-all hover:border-primary/50 shadow-lg hover:shadow-2xl dark:shadow-none"
            >
              <motion.div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                {feature.icon}
              </motion.div>
              <h3 className="mb-2 font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>

              {/* Hover glow effect */}
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${feature.color.includes("blue") ? "rgba(59, 130, 246, 0.1)" : feature.color.includes("purple") ? "rgba(139, 92, 246, 0.1)" : "rgba(245, 158, 11, 0.1)"} 0%, transparent 70%)`,
                  }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
