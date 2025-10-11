'use client'

import * as React from 'react'
import { useUser } from '@/hooks/use-user'

export function DashboardHeader() {
  const { profile, user, loading } = useUser()

  const fullName = profile?.full_name?.trim()
  const displayName = fullName?.split(/\s+/)[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20 border-b border-border">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />

      <div className="relative px-8 py-4">
        <div className="max-w-4xl">
          <div className="space-y-3">
            {/* Greeting */}
            <div className="space-y-1.5">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-8 w-64 bg-muted rounded" />
                  <div className="h-6 w-96 bg-muted rounded" />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Hey {displayName}! 🤟, Let&apos;s get studying!
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-2xl">
                    Choose your path to learning and growth.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
