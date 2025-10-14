"use client"

import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { buttonVariants } from "@/components/ui"
import { Sparkles, Rocket, ArrowRight } from "lucide-react"
import { AnimatedBackground } from "./animated-background"
import { useRef } from "react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

export default function HeroSection() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)

  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 500], [0, 100])
  const y2 = useTransform(scrollY, [0, 500], [0, -50])
  const opacity = useTransform(scrollY, [0, 600], [1, 0.3])

  // Split headline into words for animated reveal
  const headline = "Learn Anything, Remember Everything"
  const words = headline.split(" ")

  return (
    <section ref={sectionRef} className="relative min-h-[90vh] overflow-hidden flex items-center w-full">
      {/* Animated mesh gradient background */}
      <AnimatedBackground />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14 w-full">
        <motion.div
          style={{ opacity: prefersReducedMotion ? 1 : opacity }}
          className="mx-auto max-w-4xl text-center"
        >
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mb-6 inline-flex px-4"
          >
            <div className="group relative inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 sm:px-4 py-1.5 text-xs sm:text-sm backdrop-blur-sm hover:border-primary/40 hover:bg-primary/10 transition-all shadow-sm dark:shadow-none">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary animate-pulse flex-shrink-0" />
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent font-medium whitespace-nowrap">
                Powered by Google Gemini AI • Next-Gen Learning
              </span>
            </div>
          </motion.div>

          {/* Main headline with word-by-word animation */}
          <div className="mb-6">
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.15,
                  },
                },
              }}
              className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl max-w-full"
            >
              {words.map((word, index) => (
                <motion.span
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
                    visible: {
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      transition: {
                        type: "spring",
                        stiffness: 150,
                        damping: 20,
                      },
                    },
                  }}
                  className={`inline-block mr-3 ${
                    index === 2 || index === 5 // "Remember" and "Everything"
                      ? "bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent animate-gradient"
                      : ""
                  }`}
                  style={{
                    backgroundSize: index === 2 || index === 5 ? "200% auto" : undefined,
                  }}
                >
                  {word}
                </motion.span>
              ))}
            </motion.h1>
          </div>

          {/* Subheadline - Vision focused */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl md:text-2xl leading-relaxed"
          >
            Transform any document into your{" "}
            <span className="font-semibold text-foreground">personal learning companion</span>.
            AI-powered tools that don’t just help you study—they help you{" "}
            <span className="font-semibold text-foreground">master anything</span>.
          </motion.p>

          {/* CTA Buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/auth/sign-up"
                className={buttonVariants({ size: "lg", variant: "default" }) + " relative group overflow-hidden text-base px-8 py-6 shadow-lg shadow-primary/25 dark:shadow-glow"}
              >
                <span className="relative z-10 flex items-center gap-2 font-semibold">
                  Start Learning Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-amber-500 to-primary opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="#demo"
                className={buttonVariants({ size: "lg", variant: "outline" }) + " text-base px-8 py-6 group backdrop-blur-sm shadow-md dark:shadow-none"}
              >
                <span className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 group-hover:rotate-12 transition-transform" />
                  See It In Action
                </span>
              </Link>
            </motion.div>
          </motion.div>

          {/* Study Tools Showcase */}
          <motion.div
            style={{ y: prefersReducedMotion ? 0 : y2 }}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.8,
                },
              },
            }}
            className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto px-2"
          >
            {[
              { icon: <span className="text-xl sm:text-2xl">📝</span>, label: "Smart Summary", color: "from-blue-500 to-cyan-400" },
              { icon: <span className="text-xl sm:text-2xl">📚</span>, label: "Study Guide", color: "from-purple-500 to-pink-400" },
              { icon: <span className="text-xl sm:text-2xl">✍️</span>, label: "Smart Notes", color: "from-amber-500 to-orange-400" },
              { icon: <span className="text-xl sm:text-2xl">🎯</span>, label: "Flashcards", color: "from-teal-500 to-emerald-400" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.9 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 150,
                      damping: 20,
                    },
                  },
                }}
                whileHover={{
                  scale: 1.05,
                  y: -5,
                  transition: { duration: 0.2 },
                }}
                className="group relative"
              >
                <div className="relative flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-border/50 bg-card/60 px-3 sm:px-6 py-3 sm:py-4 backdrop-blur-sm hover:border-primary/50 hover:bg-card/80 transition-all shadow-md hover:shadow-lg dark:shadow-none">
                  <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg sm:rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-lg group-hover:shadow-xl transition-shadow flex-shrink-0`}>
                    {feature.icon}
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-center sm:text-left">{feature.label}</span>

                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Floating decorative elements with parallax */}
      {!prefersReducedMotion && (
        <>
          <motion.div
            style={{ y: y1 }}
            className="absolute top-1/4 left-[10%] h-2 w-2 rounded-full bg-primary/30 blur-sm"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            style={{ y: y2 }}
            className="absolute top-1/3 right-[15%] h-3 w-3 rounded-full bg-amber-500/30 blur-sm"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </>
      )}
    </section>
  )
}
