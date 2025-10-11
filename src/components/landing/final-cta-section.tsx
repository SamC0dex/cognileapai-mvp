"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { buttonVariants } from "@/components/ui"
import { animationVariants as A, getReducedMotionVariants } from "@/lib/landing/animation-variants"

export default function FinalCtaSection() {
  const prefersReducedMotion = useReducedMotion()
  return (
    <section className="relative py-16 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl opacity-25 bg-[radial-gradient(ellipse_at_center,theme(colors.brand.purple.500),transparent_60%)] dark:opacity-30" />
      </div>
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={prefersReducedMotion ? getReducedMotionVariants(A.scroll.reveal) : A.scroll.reveal}
          className="mx-auto max-w-3xl rounded-3xl border bg-card/70 p-8 text-center shadow-glow backdrop-blur"
        >
          <h2 className="text-balance text-3xl font-semibold sm:text-4xl">Study faster. Understand deeper.</h2>
          <p className="mt-3 text-muted-foreground">CogniLeap turns dense PDFs into knowledge you can act on.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/auth/sign-in"
              className={buttonVariants({ size: "lg", variant: "default" }) + " shadow-glow"}
            >
              Start now
            </Link>
            <Link
              href="/dashboard"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Try the demo
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
