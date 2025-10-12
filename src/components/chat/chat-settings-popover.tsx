"use client"

import { Settings } from 'lucide-react'
import React from 'react'
import { cn } from '@/lib/utils'

export function ChatSettingsPopover(): React.ReactElement {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl",
        "border border-border bg-background/80 backdrop-blur-sm",
        "text-muted-foreground transition-all duration-200",
        "hover:border-primary/40 hover:bg-primary/5 hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "cursor-not-allowed opacity-50"
      )}
      aria-label="Settings (Coming Soon)"
      title="Settings (Coming Soon)"
      disabled
    >
      <Settings className="h-[18px] w-[18px]" />
    </button>
  )
}

ChatSettingsPopover.displayName = 'ChatSettingsPopover'
