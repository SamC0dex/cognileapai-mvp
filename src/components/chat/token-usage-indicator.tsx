"use client"

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import * as Popover from '@radix-ui/react-popover'
import type { ConversationTokens } from '@/lib/token-manager'
import { TokenManager } from '@/lib/token-manager'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Zap,
  MessageSquare,
  FileText,
  Cpu,
  Sparkles,
  TrendingUp,
  Info,
  Lightbulb,
  BookOpen,
  Database
} from 'lucide-react'

interface TokenUsageIndicatorProps {
  tokens: ConversationTokens | null
  isCalculating?: boolean
  className?: string
}

const LIMIT = TokenManager.LIMITS.PRACTICAL_INPUT_MAX
const FORMATTER = new Intl.NumberFormat('en-US')

// Status configuration based on user requirements
type StatusLevel = 'healthy' | 'caution' | 'warning' | 'critical'

interface StatusConfig {
  level: StatusLevel
  label: string
  message: string
  color: string
  bgColor: string
  borderColor: string
  icon: React.ElementType
  iconColor: string
}

const getStatusConfig = (percentage: number): StatusConfig => {
  if (percentage >= 100) {
    return {
      level: 'critical',
      label: 'Critical',
      message: 'Context limit reached. Start a new chat to continue effectively.',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      borderColor: 'border-red-300 dark:border-red-800',
      icon: AlertTriangle,
      iconColor: 'text-red-600 dark:text-red-400'
    }
  }

  if (percentage >= 90) {
    return {
      level: 'warning',
      label: 'Warning',
      message: 'Approaching context limit. Consider starting a fresh chat soon.',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
      borderColor: 'border-orange-300 dark:border-orange-800',
      icon: AlertTriangle,
      iconColor: 'text-orange-600 dark:text-orange-400'
    }
  }

  if (percentage >= 75) {
    return {
      level: 'caution',
      label: 'Caution',
      message: 'Context usage is growing. Monitor your conversation length.',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      borderColor: 'border-amber-300 dark:border-amber-800',
      icon: Zap,
      iconColor: 'text-amber-600 dark:text-amber-400'
    }
  }

  return {
    level: 'healthy',
    label: 'Healthy',
    message: 'Plenty of context space available. Chat away!',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-300 dark:border-emerald-800',
    icon: Database,
    iconColor: 'text-emerald-600 dark:text-emerald-400'
  }
}

// Compact badge component
export const TokenUsageBadge: React.FC<TokenUsageIndicatorProps> = ({
  tokens,
  isCalculating = false,
  className
}) => {
  const percentage = useMemo(() => {
    if (!tokens) return 0
    return Math.min(100, Math.round((tokens.totalTokens / LIMIT) * 100))
  }, [tokens])

  const status = useMemo(() => getStatusConfig(percentage), [percentage])
  const StatusIcon = status.icon

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex items-center gap-2 h-10 px-3 rounded-xl",
            "border bg-background/80 backdrop-blur-sm",
            "transition-all duration-300 hover:scale-105",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            status.borderColor,
            status.bgColor,
            "focus-visible:ring-primary/40",
            isCalculating && "animate-pulse",
            className
          )}
          aria-label={`Token usage: ${percentage}% - ${status.label}`}
        >
          {/* Status icon - no circle */}
          <div className="flex-shrink-0">
            <StatusIcon className={cn("w-5 h-5", status.iconColor)} />
          </div>

          {/* Percentage display */}
          <motion.span
            key={percentage}
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn("text-sm font-semibold tabular-nums", status.color)}
          >
            {percentage}%
          </motion.span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-[380px] max-w-[95vw] rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl focus:outline-none animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
        >
          <DetailedTokenView tokens={tokens} isCalculating={isCalculating} />
          <Popover.Arrow className="fill-background/95" width={16} height={8} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// Detailed view in popover
const DetailedTokenView: React.FC<{ tokens: ConversationTokens | null; isCalculating: boolean }> = ({
  tokens,
  isCalculating
}) => {
  const percentage = useMemo(() => {
    if (!tokens) return 0
    return Math.min(100, Math.round((tokens.totalTokens / LIMIT) * 100))
  }, [tokens])

  const remaining = useMemo(() => {
    if (!tokens) return LIMIT
    return Math.max(0, LIMIT - tokens.totalTokens)
  }, [tokens])

  const status = useMemo(() => getStatusConfig(percentage), [percentage])
  const StatusIcon = status.icon

  const breakdown = useMemo(() => {
    if (!tokens) {
      return [
        { label: 'Document context', value: 0, icon: FileText, color: 'text-sky-600 dark:text-sky-400', percentage: '0.0' },
        { label: 'User messages', value: 0, icon: MessageSquare, color: 'text-primary', percentage: '0.0' },
        { label: 'AI responses', value: 0, icon: Sparkles, color: 'text-emerald-600 dark:text-emerald-400', percentage: '0.0' },
        { label: 'System prompt', value: 0, icon: Cpu, color: 'text-purple-600 dark:text-purple-400', percentage: '0.0' }
      ]
    }

    const total = tokens.totalTokens || 1

    return [
      {
        label: 'Document context',
        value: tokens.documentTokens,
        icon: FileText,
        color: 'text-sky-600 dark:text-sky-400',
        percentage: ((tokens.documentTokens / total) * 100).toFixed(1)
      },
      {
        label: 'User messages',
        value: tokens.userTokens,
        icon: MessageSquare,
        color: 'text-primary',
        percentage: ((tokens.userTokens / total) * 100).toFixed(1)
      },
      {
        label: 'AI responses',
        value: tokens.assistantTokens,
        icon: Sparkles,
        color: 'text-emerald-600 dark:text-emerald-400',
        percentage: ((tokens.assistantTokens / total) * 100).toFixed(1)
      },
      {
        label: 'System prompt',
        value: tokens.systemTokens,
        icon: Cpu,
        color: 'text-purple-600 dark:text-purple-400',
        percentage: ((tokens.systemTokens / total) * 100).toFixed(1)
      }
    ]
  }, [tokens])

  return (
    <div className="p-4 space-y-4">
      {/* Header with status */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl",
          status.bgColor,
          status.borderColor,
          "border"
        )}>
          <StatusIcon className={cn("w-5 h-5", status.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Context Usage</h3>
            <span className={cn(
              "px-2 py-0.5 text-xs font-medium rounded-full",
              status.bgColor,
              status.color
            )}>
              {status.label}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            {isCalculating ? 'Calculating token usage...' : status.message}
          </p>
        </div>

        {/* Info icon with tooltip */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="What are tokens?"
            >
              <Info className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content
              sideOffset={8}
              align="end"
              className="z-[60] w-[320px] max-w-[95vw] rounded-xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl focus:outline-none animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
            >
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">What are tokens?</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tokens are small pieces of text that AI uses to read and understand. Everything gets counted: words, word parts, spaces, punctuation, even emojis!
                    </p>
                    <div className="text-xs space-y-1.5 pt-1">
                      <div className="font-medium text-foreground/90">Real examples:</div>
                      <div className="text-muted-foreground pl-2 space-y-1">
                        <div>&quot;Hi&quot; = 1 token</div>
                        <div>&quot;I love pizza!&quot; = 5 tokens (&quot;I&quot; + &quot; love&quot; + &quot; pizza&quot; + &quot;!&quot; + spaces)</div>
                        <div>&quot;Can you help me?&quot; = 6 tokens (&quot;Can&quot; + &quot; you&quot; + &quot; help&quot; + &quot; me&quot; + &quot;?&quot; + spaces)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="text-xs font-medium text-foreground/90">Your 200K token limit:</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This includes all your messages, AI responses, and document content. That&apos;s about <strong className="text-foreground">150,000 words</strong> or roughly <strong className="text-foreground">400-500 pages</strong> of text — plenty of room for long conversations!
                  </p>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Staying under this limit ensures fast and accurate AI responses. Start a new chat if you&apos;re getting close to 100%.
                    </p>
                  </div>
                </div>
              </div>
              <Popover.Arrow className="fill-background/95" width={12} height={6} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Usage</span>
          <motion.span
            key={percentage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn("font-semibold tabular-nums", status.color)}
          >
            {percentage}%
          </motion.span>
        </div>

        <div className="relative h-2.5 bg-muted/50 rounded-full overflow-hidden border border-border/40">
          <motion.div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full",
              percentage >= 100 ? "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-500 dark:to-red-600" :
              percentage >= 90 ? "bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-500 dark:to-orange-600" :
              percentage >= 75 ? "bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-500 dark:to-amber-600" :
              "bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500"
            )}
            style={{
              boxShadow: percentage >= 75 ? '0 0 8px currentColor' : 'none',
              opacity: 0.9
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Token stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Used</div>
          <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
            {FORMATTER.format(tokens?.totalTokens || 0)}
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Free</div>
          <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
            {FORMATTER.format(remaining)}
          </div>
        </div>

        <div className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Limit</div>
          <div className="mt-1 text-sm font-semibold text-foreground tabular-nums">
            {FORMATTER.format(LIMIT / 1000)}K
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span className="font-medium">Token Breakdown</span>
        </div>

        <div className="space-y-1.5">
          {breakdown.map((item) => {
            const ItemIcon = item.icon
            return (
              <div key={item.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ItemIcon className={cn("w-3.5 h-3.5 flex-shrink-0", item.color)} />
                  <span className="text-muted-foreground truncate">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {tokens && item.percentage && (
                    <span className="text-[10px] text-muted-foreground/70 tabular-nums">
                      {item.percentage}%
                    </span>
                  )}
                  <span className="font-medium text-foreground tabular-nums min-w-[60px] text-right">
                    {FORMATTER.format(item.value)}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Total */}
          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border/50">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-foreground flex-shrink-0" />
              <span className="text-foreground font-semibold">Total</span>
            </div>
            <span className="font-semibold text-foreground tabular-nums">
              {FORMATTER.format(tokens?.totalTokens || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Best Practices */}
      <div className="pt-3 border-t border-border/50">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground/90">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Best Practices</span>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <MessageSquare className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>Keep conversations focused on specific topics for better AI responses</span>
            </li>
            <li className="flex items-start gap-2">
              <BookOpen className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>Upload documents for context instead of pasting large texts</span>
            </li>
            <li className="flex items-start gap-2">
              <Zap className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
              <span>Start a new chat when context usage approaches 75% for optimal quality</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Last updated */}
      {tokens && (
        <div className="text-center text-[10px] text-muted-foreground/70">
          Last updated: {tokens.lastUpdated.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })}
        </div>
      )}
    </div>
  )
}

// Legacy export for backward compatibility
export const ContextUsageCard = TokenUsageBadge

TokenUsageBadge.displayName = 'TokenUsageBadge'
