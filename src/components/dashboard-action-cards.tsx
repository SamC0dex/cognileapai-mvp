'use client'

import * as React from 'react'
import { BookOpen, Lightbulb, Upload, FileText } from 'lucide-react'
import { ActionCard } from '@/components/ui'

interface DashboardActionCardsProps {
  onStartCourse?: () => void
  onStartLesson?: () => void
  onUploadDocument?: () => void
}

export function DashboardActionCards({ 
  onStartCourse, 
  onStartLesson,
  onUploadDocument 
}: DashboardActionCardsProps) {
  const actionCards = [
    {
      title: "Start a Course",
      description: "Plan for a Course",
      icon: <BookOpen className="h-6 w-6" />,
      variant: "purple" as const,
      onClick: onStartCourse
    },
    {
      title: "Start a Lesson", 
      description: "Learn something new!",
      icon: <Lightbulb className="h-6 w-6" />,
      variant: "teal" as const,
      onClick: onStartLesson
    },
    {
      title: "Upload Document",
      description: "Add PDFs to analyze",
      icon: <Upload className="h-6 w-6" />,
      variant: "default" as const,
      onClick: onUploadDocument
    }
  ]

  return (
    <div className="px-8 py-4">
      <div className="space-y-6">
        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
          {actionCards.map((card) => (
            <ActionCard
              key={card.title}
              title={card.title}
              description={card.description}
              icon={card.icon}
              variant={card.variant}
              onClick={card.onClick}
              className="h-24 hover:shadow-glow"
            />
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl pt-4 mx-auto">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center mx-auto border border-blue-500/20">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Smart Summaries</h3>
              <p className="text-sm text-muted-foreground">
                Extract key insights and main points from your documents automatically
              </p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center mx-auto border border-green-500/20">
              <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Study Guides</h3>
              <p className="text-sm text-muted-foreground">
                Generate structured study materials and practice questions
              </p>
            </div>
          </div>

          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center mx-auto border border-purple-500/20">
              <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base mb-1">Smart Notes</h3>
              <p className="text-sm text-muted-foreground">
                Create organized notes with key concepts highlighted
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}