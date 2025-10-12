"use client"

import * as Popover from '@radix-ui/react-popover'
import { Settings } from 'lucide-react'
import React from 'react'
import type { ConversationTokens } from '@/lib/token-manager'
import { TokenManager } from '@/lib/token-manager'
import { Button } from '@/components/ui'
import { ContextUsageCard } from './token-usage-indicator'

interface ChatSettingsPopoverProps {
  tokenUsage: {
    tokens: ConversationTokens | null
    isCalculating: boolean
  }
  onStartNewChat: () => void
}

export function ChatSettingsPopover({ tokenUsage, onStartNewChat }: ChatSettingsPopoverProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 text-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label="Open chat settings"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={14}
          align="end"
          className="z-50 w-[420px] max-w-[92vw] rounded-3xl border border-border/60 bg-background/95 p-3 text-sm shadow-[0_35px_90px_-40px_rgba(19,190,168,0.55)] backdrop-blur-xl focus:outline-none"
        >
          <div className="relative space-y-4 rounded-3xl border border-border/60 bg-black/40 p-5 text-foreground">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Chat Settings</p>
                <h2 className="mt-1 text-lg font-semibold text-foreground">Conversation controls</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monitor context usage and keep responses crisp without leaving the chat.
                </p>
              </div>
              <Popover.Close className="rounded-lg border border-border/50 bg-muted/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
                Close
              </Popover.Close>
            </div>

            <ContextUsageCard tokens={tokenUsage.tokens} isCalculating={tokenUsage.isCalculating} />

            <div className="grid gap-3 sm:grid-cols-2">
              <Popover.Close asChild>
                <Button
                  variant="outline"
                  className="justify-start gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                  onClick={onStartNewChat}
                >
                  Start fresh chat
                </Button>
              </Popover.Close>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground/80">Best practices</p>
                <ul className="mt-2 space-y-1">
                  <li>• Pin key takeaways before archiving.</li>
                  <li>• Summarize long uploads every 75% usage.</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground/80">Auto-optimization</p>
              <p className="mt-1">
                We automatically keep <span className="text-foreground">{Intl.NumberFormat('en-US').format(TokenManager.LIMITS.PRACTICAL_OUTPUT_MAX)}</span> tokens free for the next response and warn you as we approach the 200k ceiling.
              </p>
            </div>
          </div>

          <Popover.Arrow className="fill-background/90" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

ChatSettingsPopover.displayName = 'ChatSettingsPopover'
