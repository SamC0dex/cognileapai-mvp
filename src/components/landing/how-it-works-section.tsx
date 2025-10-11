"use client"

import { motion } from "framer-motion"
import { Upload, ListChecks, MessagesSquare, FileDown } from "lucide-react"
import { animationVariants as A } from "@/lib/landing/animation-variants"

const STEPS = [
  {
    icon: <Upload className="h-5 w-5" />, title: "Upload", desc: "Drop in your PDFs — we handle chunking and structure awareness.",
  },
  {
    icon: <MessagesSquare className="h-5 w-5" />, title: "Chat & Generate", desc: "Ask questions, then create summaries, notes, guides, and flashcards.",
  },
  {
    icon: <ListChecks className="h-5 w-5" />, title: "Study", desc: "Learn with interactive cards and guided paths that build mastery.",
  },
  {
    icon: <FileDown className="h-5 w-5" />, title: "Export", desc: "Take your knowledge offline with polished PDF/DOCX.",
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">How it works</h2>
          <p className="mt-3 text-muted-foreground">From file to insight in minutes.</p>
        </div>

        <motion.ol
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={A.timeline.container}
          className="mx-auto mt-10 max-w-3xl space-y-6"
        >
          {STEPS.map((s, i) => (
            <motion.li key={i} variants={A.timeline.item} className="relative rounded-xl border bg-card/60 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {s.icon}
                </div>
                <div>
                  <h3 className="font-medium">{i + 1}. {s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  )
}
