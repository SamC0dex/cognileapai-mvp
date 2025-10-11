"use client"

import { motion } from "framer-motion"
import { FileText, MessageSquare, PanelsTopLeft, Sparkles, LayoutGrid } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import { animationVariants as A } from "@/lib/landing/animation-variants"

const FEATURES = [
  { icon: <Sparkles className="h-5 w-5" />, title: "One‑click study materials", desc: "Instant summaries, notes, guides, and flashcards from your PDFs." },
  { icon: <MessageSquare className="h-5 w-5" />, title: "Document‑aware chat", desc: "Ask questions and get answers grounded in your file." },
  { icon: <PanelsTopLeft className="h-5 w-5" />, title: "Interactive flashcards", desc: "Swipe, shuffle, and track progress during study sessions." },
  { icon: <LayoutGrid className="h-5 w-5" />, title: "Organized study canvas", desc: "A clean workspace to collect insights as you read." },
  { icon: <FileText className="h-5 w-5" />, title: "Export ready", desc: "Save notes and guides as polished PDFs or DOCX." },
] as const

export default function FeaturesSection() {
  return (
    <section id="features" className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Everything you need to study faster</h2>
          <p className="mt-3 text-muted-foreground">Purpose‑built tools that transform reading into understanding.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={A.gridContainer}
          className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-6"
        >
          {FEATURES.map((f, i) => {
            // Center last two items on second row for lg screens using 6-col grid
            const centerRowClass = i === 3 ? 'lg:col-start-2' : i === 4 ? 'lg:col-start-4' : ''
            return (
              <motion.div key={i} variants={A.gridItem} className={`lg:col-span-2 ${centerRowClass}`}>
                <motion.div variants={A.card3DTilt} whileHover="hover" initial="rest" animate="rest">
                  <Card className="h-full">
                    <CardHeader className="flex-row items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {f.icon}
                      </div>
                      <CardTitle className="text-base">{f.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 text-sm text-muted-foreground">{f.desc}</CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
