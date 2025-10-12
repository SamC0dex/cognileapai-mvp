"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Plus, Minus, HelpCircle } from "lucide-react"
import { useState } from "react"
import { SectionBackground } from "./animated-background"

/**
 * FAQ Section - Modern Accordion with Smooth Animations
 *
 * Features custom accordion implementation with:
 * - Smooth expand/collapse animations
 * - Rotating icons (plus/minus)
 * - Gradient highlights on active items
 * - Staggered reveal animations
 */

const FAQ_ITEMS = [
  {
    question: "What makes this different from other study tools?",
    answer:
      "CogniLeap uses production-grade AI with Gemini 2.5 Pro and FREE semantic search via Transformers.js. Unlike basic note-taking apps, we build complete knowledge graphs from your documents, enabling deep understanding rather than surface-level summaries. The system understands context, relationships, and can answer complex questions about your materials.",
  },
  {
    question: "How does the AI processing work?",
    answer:
      "We use a sophisticated multi-stage pipeline: (1) PDF parsing with structure-aware extraction, (2) Semantic embedding generation using 384-dimensional vectors, (3) Neural processing with Google Gemini for concept identification and relationship mapping, (4) Intelligent content generation tailored to your learning style. All processing happens in under 60 seconds.",
  },
  {
    question: "What document formats are supported?",
    answer:
      "Currently optimized for PDF documents including research papers, textbooks, lecture slides, and technical documentation. Our OCR and structure-aware parsing handles complex layouts, tables, equations, and images while preserving document hierarchy and contextual relationships.",
  },
  {
    question: "Can I export the generated study materials?",
    answer:
      "Yes! All generated content (summaries, notes, study guides, and flashcards) can be exported to professionally formatted PDF or DOCX files. Exports maintain proper formatting, include all visual elements, and are ready for printing or sharing. You can also access everything offline once generated.",
  },
  {
    question: "Is my data secure and private?",
    answer:
      "Absolutely. All documents are stored in private Supabase storage with Row Level Security (RLS) enabled. Your data is isolated per user, processing happens on secure servers, and we never share or train models on your content. Semantic search runs locally in your browser using Transformers.js for zero API costs and complete privacy.",
  },
  {
    question: "What are the technical requirements?",
    answer:
      "CogniLeap runs in any modern web browser (Chrome, Firefox, Safari, Edge). For optimal performance, we recommend 8GB+ RAM and a stable internet connection during document upload and AI processing. Once materials are generated, they're cached locally for offline access. The semantic search model (22MB) downloads once and runs entirely in your browser.",
  },
]

function FAQAccordionItem({
  item,
  index,
  isOpen,
  onToggle,
}: {
  item: typeof FAQ_ITEMS[number]
  index: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: index * 0.08 }}
      className="group relative overflow-hidden rounded-xl border transition-all duration-300"
      style={{
        borderColor: isOpen ? "rgba(20, 184, 166, 0.5)" : "hsl(var(--border) / 0.5)",
        backgroundColor: isOpen ? "rgba(20, 184, 166, 0.05)" : "hsl(var(--card) / 0.6)",
        boxShadow: isOpen ? "0 10px 40px rgba(20, 184, 166, 0.15)" : "none",
      }}
    >
      {/* Question button */}
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-6 text-left transition-colors"
      >
        {/* Icon */}
        <motion.div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-teal-400 text-white shadow-lg"
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.05 : 1,
          }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
        >
          {isOpen ? <Minus className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </motion.div>

        {/* Question text */}
        <div className="flex-1">
          <h3
            className={`font-semibold transition-colors ${
              isOpen ? "text-primary" : "text-foreground group-hover:text-primary"
            }`}
          >
            {item.question}
          </h3>
        </div>
      </button>

      {/* Answer with smooth height animation */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.3, ease: "easeInOut" },
              opacity: { duration: 0.2, ease: "easeInOut" },
            }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              exit={{ y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-6 pb-6 pl-[4.5rem]"
            >
              <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated gradient border */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300"
        style={{
          background: "linear-gradient(135deg, rgba(20, 184, 166, 0.3), transparent, rgba(20, 184, 166, 0.3))",
          backgroundSize: "200% 200%",
        }}
        animate={{
          backgroundPosition: isOpen ? ["0% 0%", "100% 100%"] : "0% 0%",
          opacity: isOpen ? 0.5 : 0,
        }}
        transition={{
          backgroundPosition: { duration: 2, repeat: Infinity, ease: "linear" },
          opacity: { duration: 0.3 },
        }}
      />
    </motion.div>
  )
}

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="relative overflow-hidden py-20 sm:py-32">
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
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm backdrop-blur-sm"
          >
            <HelpCircle className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">Common Questions</span>
          </motion.div>

          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Everything You{" "}
            <span className="bg-gradient-to-r from-primary via-amber-500 to-primary bg-clip-text text-transparent animate-gradient" style={{ backgroundSize: "200% auto" }}>
              Need to Know
            </span>
          </h2>

          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Technical details, features, and answers to help you understand the full capabilities of CogniLeap's AI
            learning system.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mx-auto mt-16 max-w-4xl"
        >
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <FAQAccordionItem
                key={index}
                item={item}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col items-center gap-3 rounded-2xl border border-border/50 bg-card/60 px-8 py-6 backdrop-blur-sm">
            <p className="text-sm text-muted-foreground">Still have questions?</p>
            <p className="text-sm">
              This is a college project showcase built to demonstrate advanced AI integration and modern web
              development.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-teal-500" />
              <span>Built with Next.js 15 • Google Gemini 2.5 Pro • Transformers.js</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
