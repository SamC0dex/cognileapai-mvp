"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { buttonVariants } from "@/components/ui"
import { Sparkles, Route, PanelsTopLeft, FileDown } from "lucide-react"
import { animationVariants as A, getReducedMotionVariants } from "@/lib/landing/animation-variants"

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden">
      {/* Background aesthetics */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full blur-3xl opacity-25 bg-[radial-gradient(ellipse_at_center,theme(colors.brand.teal.500),transparent_60%)] dark:opacity-30" />
        <div className="absolute -bottom-40 right-0 h-96 w-[36rem] rounded-full blur-3xl opacity-20 bg-[radial-gradient(ellipse_at_center,theme(colors.brand.amber.500),transparent_60%)] dark:opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={prefersReducedMotion ? getReducedMotionVariants(A.hero) : A.hero}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.h1
            variants={A.heroHeadline}
            className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
          >
            Turn PDFs into an A‑grade study kit
          </motion.h1>

          <motion.p variants={A.heroChild} className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
            Drop in a paper or chapter. Get crisp summaries, guided steps, and interactive flashcards — ready in minutes.
            Built to impress in class and make revision actually enjoyable.
          </motion.p>

          <motion.div variants={A.heroChild} className="mt-8 flex items-center justify-center gap-3">
            <Link href="/auth/sign-up" className={buttonVariants({ size: "lg", variant: "default" }) + " shadow-glow"}>Sign up</Link>
            <Link href="/auth/sign-in" className={buttonVariants({ size: "lg", variant: "outline" })}>Sign in</Link>
          </motion.div>

          <motion.ul variants={A.heroChild} className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <li className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-foreground/80 shadow-soft backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Smart Summaries
            </li>
            <li className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-foreground/80 shadow-soft backdrop-blur-sm">
              <Route className="h-3.5 w-3.5 text-primary" />
              Guided Study
            </li>
            <li className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-foreground/80 shadow-soft backdrop-blur-sm">
              <PanelsTopLeft className="h-3.5 w-3.5 text-primary" />
              Flashcards
            </li>
            <li className="flex items-center justify-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-2 text-xs text-foreground/80 shadow-soft backdrop-blur-sm">
              <FileDown className="h-3.5 w-3.5 text-primary" />
              PDF/DOCX Export
            </li>
          </motion.ul>
        </motion.div>
      </div>
    </section>
  )
}
