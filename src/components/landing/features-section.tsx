"use client"

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import { Brain, MessageSquare, Zap, Sparkles, FileText, Search } from "lucide-react"
import { useRef, useState, MouseEvent } from "react"
import { SectionBackground } from "./animated-background"
import { cn } from "@/lib/utils"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

const FEATURES = [
  {
    icon: <Brain className="h-6 w-6" />,
    title: "AI-Powered Study Tools",
    desc: "Transform any document into comprehensive study guides, smart summaries, and organized notes in seconds. Our AI understands context and creates learning materials tailored to how you learn best.",
    color: "from-teal-500 to-cyan-400",
    glow: "rgba(20, 184, 166, 0.3)",
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Intelligent Document Chat",
    desc: "Ask anything about your documents and get instant, contextual answers. It's like having a personal tutor who has read and understood every page, ready to explain concepts and clarify confusion.",
    color: "from-blue-500 to-indigo-400",
    glow: "rgba(59, 130, 246, 0.3)",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Lightning-Fast Generation",
    desc: "Get complete study materials in under a minute. No waiting, no manual work—just upload your document and watch as AI instantly creates everything you need to excel.",
    color: "from-amber-500 to-orange-400",
    glow: "rgba(245, 158, 11, 0.3)",
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: "Interactive Flashcards",
    desc: "Master concepts with intelligent flashcard generation and spaced repetition. Swipe through cards with Tinder-style animations, track your progress, and focus on areas that need improvement.",
    color: "from-purple-500 to-pink-400",
    glow: "rgba(168, 85, 247, 0.3)",
  },
  {
    icon: <Search className="h-6 w-6" />,
    title: "FREE Semantic Search",
    desc: "Find exactly what you need with advanced AI-powered search. Understands context and meaning, not just keywords—completely FREE with no API costs.",
    color: "from-emerald-500 to-teal-400",
    glow: "rgba(16, 185, 129, 0.3)",
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Export Anywhere",
    desc: "Take your learning offline with professional PDF and DOCX exports. Beautifully formatted study materials you can print, share, or access anywhere.",
    color: "from-rose-500 to-red-400",
    glow: "rgba(244, 63, 94, 0.3)",
  },
] as const

function FeatureCard3D({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()

  // Motion values for 3D tilt effect
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Spring animations for smooth movement (faster for optimization)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 400,
    damping: 25,
  })
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 400,
    damping: 25,
  })

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return

    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const percentX = (e.clientX - centerX) / (rect.width / 2)
    const percentY = (e.clientY - centerY) / (rect.height / 2)

    mouseX.set(percentX)
    mouseY.set(percentY)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        type: "spring",
        stiffness: 120,
        damping: 18,
        delay: index * 0.05,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      className="group relative h-full"
      style={{
        perspective: "1000px",
      }}
    >
      <motion.div
        className="relative h-full"
        style={{
          rotateX: !prefersReducedMotion && isHovered ? rotateX : 0,
          rotateY: !prefersReducedMotion && isHovered ? rotateY : 0,
          transformStyle: "preserve-3d",
        }}
        whileHover={prefersReducedMotion ? {} : { scale: 1.02, z: 30 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Dynamic particle burst on hover */}
        {!prefersReducedMotion && isHovered && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute h-1 w-1 rounded-full"
                style={{
                  background: feature.glow,
                  left: "50%",
                  top: "50%",
                }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.5, 0],
                  x: Math.cos((i * Math.PI * 2) / 6) * 50,
                  y: Math.sin((i * Math.PI * 2) / 6) * 50,
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 0.5,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}

        {/* Card content with advanced effects */}
        <div
          className={cn(
            "relative h-full overflow-hidden rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300",
            "bg-white/95 shadow-[0_24px_48px_rgba(15,23,42,0.08)] border-white/70",
            "dark:bg-[rgba(15,23,42,0.82)] dark:border-white/10 dark:shadow-[0_22px_48px_rgba(2,6,23,0.55)]"
          )}
          style={{
            transform: prefersReducedMotion ? undefined : "translateZ(20px)",
            borderColor: isHovered ? feature.glow : undefined,
            boxShadow: isHovered && !prefersReducedMotion
              ? `0 20px 60px ${feature.glow}, 0 0 30px ${feature.glow}`
              : undefined,
          }}
        >
          {/* Animated icon background */}
          <motion.div
            className={`relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg`}
            animate={{
              boxShadow: isHovered && !prefersReducedMotion
                ? `0 20px 40px ${feature.glow}, 0 0 20px ${feature.glow}`
                : "0 10px 20px rgba(0, 0, 0, 0.1)",
            }}
            transition={{ duration: 0.25 }}
            style={{
              transform: prefersReducedMotion ? undefined : "translateZ(40px)",
            }}
          >
            <motion.div
              animate={{
                rotate: isHovered && !prefersReducedMotion ? 360 : 0,
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{
                rotate: { duration: 0.5, ease: "easeInOut" },
                scale: { duration: 0.2 },
              }}
            >
              {feature.icon}
            </motion.div>

            {/* Orbiting particles */}
            {!prefersReducedMotion && isHovered && (
              <motion.div
                className="absolute h-1.5 w-1.5 rounded-full bg-white"
                animate={{
                  rotate: 360,
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  rotate: { duration: 1.5, repeat: Infinity, ease: "linear" },
                  scale: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{
                  offsetPath: "circle(28px)",
                }}
              />
            )}
          </motion.div>

          <motion.h3
            className="mb-2 text-lg font-semibold"
            style={{
              transform: prefersReducedMotion ? undefined : "translateZ(30px)",
            }}
          >
            {feature.title}
          </motion.h3>

          <motion.p
            className="text-sm leading-relaxed text-muted-foreground"
            style={{
              transform: prefersReducedMotion ? undefined : "translateZ(20px)",
            }}
          >
            {feature.desc}
          </motion.p>

          {/* Animated gradient border on hover */}
          {!prefersReducedMotion && (
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, ${feature.glow}, transparent, ${feature.glow})`,
                backgroundSize: "200% 200%",
              }}
              animate={{
                backgroundPosition: isHovered ? ["0% 0%", "100% 100%"] : "0% 0%",
                opacity: isHovered ? 0.3 : 0,
              }}
              transition={{
                backgroundPosition: { duration: 1.5, repeat: Infinity, ease: "linear" },
                opacity: { duration: 0.25 },
              }}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-10 sm:py-16 overflow-hidden">
      <SectionBackground />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Powered by AI</span>
          </div>

          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent animate-gradient" style={{ backgroundSize: "200% auto" }}>
              Master Anything
            </span>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Powerful tools that transform dense documents into deep understanding. Study smarter, not harder.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:mt-20 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard3D key={index} feature={feature} index={index} />
          ))}
        </div>

        {/* Bottom tech badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "0px" }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-6 py-3 text-sm font-medium backdrop-blur-sm">
            <Brain className="h-4 w-4" />
            <span>
              Built with <span className="font-semibold text-primary">Google Gemini Pro</span> • <span className="font-semibold text-primary">Transformers.js</span> • <span className="font-semibold text-primary">Next.js 15</span>
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

