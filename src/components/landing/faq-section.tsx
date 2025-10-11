"use client"

import { motion } from "framer-motion"
import { animationVariants as A } from "@/lib/landing/animation-variants"

const FAQ = [
  { q: "Is this free?", a: "Yes. This project is built for college use — you can try it without paying." },
  { q: "Do I need an account?", a: "Sign up to save your sessions, notes, guides, and flashcards for later." },
  { q: "What file types work best?", a: "Start with PDFs. Upload a paper, slides, or a chapter — then generate study materials." },
  { q: "Can I export the generated content?", a: "Yes. Export summaries, notes, guides, and flashcards to PDF or DOCX in a click." },
]

export default function FaqSection() {
  return (
    <section id="faq" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Frequently asked</h2>
          <p className="mt-3 text-muted-foreground">Everything you need to know before you start.</p>
        </div>

        <div className="mx-auto mt-10 max-w-3xl divide-y rounded-xl border bg-card/60">
          {FAQ.map((item, i) => (
            <motion.details
              key={i}
              initial="collapsed"
              whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
              className="group"
            >
              <summary className="cursor-pointer list-none p-5 text-left font-medium">
                {item.q}
              </summary>
              <motion.div
                initial="collapsed"
                animate="expanded"
                variants={A.accordion}
                className="px-5 pb-5 text-sm text-muted-foreground"
              >
                {item.a}
              </motion.div>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  )
}
