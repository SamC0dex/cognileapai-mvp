"use client"

import { motion } from "framer-motion"
import { Clock, Brain, Trophy, ThumbsUp } from "lucide-react"
import { Card, CardContent } from "@/components/ui"
import { animationVariants as A } from "@/lib/landing/animation-variants"

const BENEFITS = [
  { icon: <Clock className="h-5 w-5" />, title: "Save hours", desc: "Skip the busywork — jump straight to what matters." },
  { icon: <Brain className="h-5 w-5" />, title: "Understand faster", desc: "Clear summaries and guided steps build true understanding." },
  { icon: <Trophy className="h-5 w-5" />, title: "Look professional", desc: "Polished exports for hand-ins, notes, and presentations." },
  { icon: <ThumbsUp className="h-5 w-5" />, title: "Made for students", desc: "Simple, clean, and reliable for class and exams." },
]

export default function BenefitsSection() {
  return (
    <section className="relative py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">Why CogniLeap</h2>
          <p className="mt-3 text-muted-foreground">Designed for serious learners who want results.</p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={A.gridContainer}
          className="mt-10 grid grid-cols-1 gap-4 sm:mt-14 sm:grid-cols-2"
        >
          {BENEFITS.map((b, i) => (
            <motion.div key={i} variants={A.gridItem}>
              <Card className="h-full">
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="font-medium">{b.title}</h3>
                    <p className="text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
