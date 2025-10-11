"use client"

import { motion } from "framer-motion"
import { animationVariants as A } from "@/lib/landing/animation-variants"

export default function DemoShowcaseSection() {
  return (
    <section id="demo" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">See it in action</h2>
          <p className="mt-3 text-muted-foreground">A lightweight preview of the chat + study flow.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={A.scroll.reveal}
          className="mx-auto mt-10 max-w-4xl rounded-2xl border bg-card/70 p-4 shadow-soft backdrop-blur"
        >
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-2 pb-3 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="ml-2">CogniChat — Document session</span>
            </div>
            <div className="space-y-3 text-sm">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="max-w-[80%] rounded-xl bg-muted p-3"
              >
                How does this paper define transfer learning and why is it useful here?
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="ml-auto max-w-[85%] rounded-xl border bg-card p-3 shadow"
              >
                Transfer learning is framed as reusing knowledge from related tasks to improve learning on a target domain.
                In this paper it enables strong performance with small labeled datasets, citing Sec. 2.3 and Fig. 4.
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 p-3 text-xs"
              >
                Generated tools: Summary • Notes • Study Guide • 24 Flashcards
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
