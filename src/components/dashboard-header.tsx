'use client'

import * as React from 'react'

interface DashboardHeaderProps {
  userName?: string
}

export function DashboardHeader({ userName = "Swami" }: DashboardHeaderProps) {

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 border-b border-border">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
      
      <div className="relative px-8 py-4">
        <div className="max-w-4xl">
          <div className="space-y-3">
            {/* Greeting */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight">
                Hey {userName}! 🤟, Let&apos;s get studying!
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Choose your path to learning and growth.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
