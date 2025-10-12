"use client"

import { motion, useInView } from "framer-motion"
import { ArrowRight, Zap, Target, TrendingUp, Award, Clock, BookOpen } from "lucide-react"
import { useRef, useState } from "react"
import { SectionBackground } from "./animated-background"
import { cn } from "@/lib/utils"

/**
 * Benefits Section - Learning Transformation Showcase
 *
 * Demonstrates the transformation from traditional learning to AI-powered mastery
 * with interactive before/after states, animated metrics, and visual progression
 */

const TRANSFORMATION_STAGES = [
  {
    title: "Traditional Learning",
    state: "before",
    icon: <Clock className="h-5 w-5" />,
    metrics: [
      { label: "Hours spent", value: "20+", color: "text-red-500" },
      { label: "Retention rate", value: "35%", color: "text-orange-500" },
      { label: "Understanding depth", value: "Surface", color: "text-amber-500" },
    ],
    description: "Manual note-taking, fragmented understanding, limited retention",
  },
  {
    title: "AI-Powered Mastery",
    state: "after",
    icon: <Award className="h-5 w-5" />,
    metrics: [
      { label: "Time to mastery", value: "< 2h", color: "text-teal-500" },
      { label: "Retention rate", value: "85%", color: "text-emerald-500" },
      { label: "Understanding depth", value: "Complete", color: "text-green-500" },
    ],
    description: "Intelligent study materials, comprehensive understanding, long-term retention",
  },
]

const IMPACT_METRICS = [
  {
    icon: <Zap className="h-6 w-6" />,
    metric: "90%",
    label: "Time Saved",
    description: "Spend less time organizing, more time learning",
    color: "from-amber-500 to-orange-400",
    glow: "rgba(245, 158, 11, 0.3)",
  },
  {
    icon: <Target className="h-6 w-6" />,
    metric: "3x",
    label: "Faster Mastery",
    description: "Accelerated learning through intelligent materials",
    color: "from-teal-500 to-cyan-400",
    glow: "rgba(20, 184, 166, 0.3)",
  },
  {
    icon: <TrendingUp className="h-6 w-6" />,
    metric: "85%",
    label: "Better Retention",
    description: "Spaced repetition and active recall built-in",
    color: "from-purple-500 to-pink-400",
    glow: "rgba(168, 85, 247, 0.3)",
  },
]

function TransformationTimeline() {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <div ref={ref} className="relative mx-auto max-w-5xl">
      {/* Timeline connector */}
      <div className="absolute left-1/2 top-1/2 h-1 w-full max-w-xs -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-red-500/30 via-amber-500/30 to-teal-500/30"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        />

        {/* Animated arrow */}
        <motion.div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          initial={{ x: -20, opacity: 0 }}
          animate={isInView ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
        >
          <ArrowRight className="h-6 w-6 text-teal-500" />
        </motion.div>
      </div>

      {/* Transformation stages */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {TRANSFORMATION_STAGES.map((stage, index) => (
          <motion.div
            key={stage.state}
            initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: index === 0 ? -30 : 30 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onMouseEnter={() => setHoveredStage(stage.state)}
            onMouseLeave={() => setHoveredStage(null)}
            className="group relative"
          >
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-500",
                hoveredStage === stage.state
                  ? "scale-105"
                  : "shadow-[0_20px_40px_rgba(15,23,42,0.08)]",
                stage.state === "before"
                  ? "border-red-500/40 bg-gradient-to-br from-white/96 via-red-50/70 to-white/92 dark:from-[rgba(239,68,68,0.12)] dark:via-[rgba(15,23,42,0.88)] dark:to-[rgba(15,23,42,0.88)] dark:border-red-500/20"
                  : "border-teal-500/40 bg-gradient-to-br from-white/96 via-teal-50/70 to-white/92 dark:from-[rgba(20,184,166,0.12)] dark:via-[rgba(15,23,42,0.88)] dark:to-[rgba(15,23,42,0.88)] dark:border-teal-500/20"
              )}
              style={{
                boxShadow:
                  hoveredStage === stage.state
                    ? stage.state === "before"
                      ? "0 24px 60px rgba(239, 68, 68, 0.28)"
                      : "0 24px 60px rgba(20, 184, 166, 0.28)"
                    : undefined,
              }}
            >
              {/* Icon badge */}
              <motion.div
                className={`mb-4 inline-flex items-center justify-center rounded-xl p-3 ${
                  stage.state === "before"
                    ? "bg-gradient-to-br from-red-500 to-orange-500"
                    : "bg-gradient-to-br from-teal-500 to-emerald-500"
                } text-white shadow-lg`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.4 }}
              >
                {stage.icon}
              </motion.div>

              {/* Title */}
              <h3 className="mb-2 text-xl font-bold">{stage.title}</h3>
              <p className="mb-6 text-sm text-muted-foreground">{stage.description}</p>

              {/* Metrics */}
              <div className="space-y-3">
                {stage.metrics.map((metric, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.05)] border-white/70 bg-white/90 dark:border-white/10 dark:bg-[rgba(15,23,42,0.75)] dark:shadow-[0_12px_30px_rgba(2,6,23,0.45)]"
                  >
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <span className={`text-lg font-bold ${metric.color}`}>{metric.value}</span>
                  </div>
                ))}
              </div>

              {/* Glow effect on hover */}
              <motion.div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                style={{
                  background:
                    stage.state === "before"
                      ? "radial-gradient(circle at center, rgba(239, 68, 68, 0.15) 0%, transparent 70%)"
                      : "radial-gradient(circle at center, rgba(20, 184, 166, 0.15) 0%, transparent 70%)",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ImpactMetricCard({ metric, index }: { metric: typeof IMPACT_METRICS[number]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-80px" })
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-8 text-center backdrop-blur-sm transition-all duration-300",
          "bg-white/95 shadow-[0_24px_48px_rgba(15,23,42,0.08)] border-white/70",
          "dark:bg-[rgba(15,23,42,0.82)] dark:border-white/10 dark:shadow-[0_22px_48px_rgba(2,6,23,0.55)]"
        )}
        style={{
          borderColor: isHovered ? metric.glow : undefined,
          boxShadow: isHovered ? `0 20px 60px ${metric.glow}` : undefined,
        }}
      >
        {/* Icon */}
        <motion.div
          className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.color} text-white shadow-lg`}
          animate={{
            rotate: isHovered ? 360 : 0,
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.6 }}
        >
          {metric.icon}
        </motion.div>

        {/* Metric */}
        <motion.div
          className="mb-2 bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-5xl font-bold text-transparent"
          animate={{
            scale: isHovered ? 1.1 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          {metric.metric}
        </motion.div>

        {/* Label */}
        <h3 className="mb-2 text-lg font-semibold">{metric.label}</h3>
        <p className="text-sm text-muted-foreground">{metric.description}</p>

        {/* Animated gradient border */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${metric.glow}, transparent, ${metric.glow})`,
            backgroundSize: "200% 200%",
          }}
          animate={{
            backgroundPosition: isHovered ? ["0% 0%", "100% 100%"] : "0% 0%",
            opacity: isHovered ? 0.3 : 0,
          }}
          transition={{
            backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
            opacity: { duration: 0.3 },
          }}
        />
      </div>
    </motion.div>
  )
}

export default function BenefitsSection() {
  return (
    <section className="relative overflow-hidden py-10 sm:py-16">
      <SectionBackground />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Learning Transformation</span>
          </div>

          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            From{" "}
            <span className="text-red-500">Overwhelmed</span>
            {" "}to{" "}
            <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Mastery
            </span>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Watch how AI transforms your learning journey from scattered information to comprehensive understanding.
            This is the difference between studying harder and studying smarter.
          </p>
        </motion.div>

        {/* Transformation Timeline */}
        <div className="mt-16">
          <TransformationTimeline />
        </div>

        {/* Impact Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.4 }}
          className="mt-20"
        >
          <div className="mb-12 text-center">
            <h3 className="text-2xl font-bold sm:text-3xl">Measurable Impact</h3>
            <p className="mt-3 text-muted-foreground">Real results backed by intelligent AI processing</p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {IMPACT_METRICS.map((metric, index) => (
              <ImpactMetricCard key={index} metric={metric} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
