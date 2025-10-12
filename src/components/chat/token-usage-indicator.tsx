"use client"

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { ConversationTokens } from '@/lib/token-manager'
import { TokenManager } from '@/lib/token-manager'
import { cn } from '@/lib/utils'
import { AlertTriangle, Gauge, Sparkles, Zap } from 'lucide-react'

interface ContextUsageCardProps {
  tokens: ConversationTokens | null
  isCalculating?: boolean
}

const LIMIT = TokenManager.LIMITS.PRACTICAL_INPUT_MAX
const RESERVED_FOR_RESPONSE = TokenManager.LIMITS.PRACTICAL_OUTPUT_MAX
const FORMATTER = new Intl.NumberFormat('en-US')

type UsageStatus = 'idle' | 'healthy' | 'caution' | 'warning' | 'critical'

const STATUS_DETAILS: Record<UsageStatus, {
  label: string
  tone: string
  accent: string
  subtext: string
  icon: React.ElementType
}> = {
  idle: {
    label: 'Calibrating',
    tone: 'text-muted-foreground',
    accent: 'from-slate-500/20 via-slate-500/10 to-transparent',
    subtext: 'Gathering usage details…',
    icon: Gauge
  },
  healthy: {
    label: 'Healthy',
    tone: 'text-emerald-300',
    accent: 'from-emerald-500/25 via-emerald-400/15 to-transparent',
    subtext: 'Plenty of runway for deeper context.',
    icon: Sparkles
  },
  caution: {
    label: 'Caution',
    tone: 'text-amber-300',
    accent: 'from-amber-500/20 via-amber-400/10 to-transparent',
    subtext: 'Consider trimming earlier turns soon.',
    icon: Zap
  },
  warning: {
    label: 'Warning',
    tone: 'text-orange-300',
    accent: 'from-orange-500/25 via-orange-400/15 to-transparent',
    subtext: 'Optimization recommended before long prompts.',
    icon: AlertTriangle
  },
  critical: {
    label: 'Critical',
    tone: 'text-red-300',
    accent: 'from-red-500/25 via-red-400/15 to-transparent',
    subtext: 'Start a fresh thread to recover quality.',
    icon: AlertTriangle
  }
}

const RADIUS = 42
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export const ContextUsageCard: React.FC<ContextUsageCardProps> = ({ tokens, isCalculating = false }) => {
  const usagePercentage = useMemo(() => {
    if (!tokens) return 0
    return Math.min(100, Math.round((tokens.totalTokens / LIMIT) * 100))
  }, [tokens])

  const remainingTokens = useMemo(() => {
    if (!tokens) return LIMIT
    return Math.max(0, LIMIT - tokens.totalTokens)
  }, [tokens])

  const status: UsageStatus = useMemo(() => {
    if (!tokens) return 'idle'
    if (usagePercentage >= 100) return 'critical'
    if (usagePercentage >= 90) return 'warning'
    if (usagePercentage >= 75) return 'caution'
    return 'healthy'
  }, [tokens, usagePercentage])

  const breakdown = useMemo(() => {
    if (!tokens) {
      return [
        { label: 'Document context', value: 0, accent: 'border-sky-500/40 text-sky-300/80' },
        { label: 'Conversation messages', value: 0, accent: 'border-primary/40 text-primary/80' },
        { label: 'System prompt', value: 0, accent: 'border-purple-500/40 text-purple-300/80' }
      ]
    }

    return [
      { label: 'Document context', value: tokens.documentTokens, accent: 'border-sky-500/40 text-sky-300' },
      { label: 'Conversation messages', value: tokens.messageTokens, accent: 'border-primary/40 text-primary' },
      { label: 'System prompt', value: tokens.systemTokens, accent: 'border-purple-500/40 text-purple-300' }
    ]
  }, [tokens])

  const historyBars = useMemo(() => {
    const base = usagePercentage / 100
    const template = [0.2, 0.35, 0.48, 0.58, 0.66, 0.72, 0.78, 0.82, 0.86, 0.9, 0.93, 0.95]
    return template.map((value, index) => Math.max(0.08, Math.min(1, value * (0.6 + base * 0.8 + index * 0.01))))
  }, [usagePercentage])

  const statusDetails = STATUS_DETAILS[status]
  const StatusIcon = statusDetails.icon

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-950/90 via-slate-950/85 to-slate-900/80 p-5 text-sm shadow-[0_25px_60px_-35px_rgba(12,148,136,0.45)]">
      <div className={cn('pointer-events-none absolute inset-0 opacity-90 blur-3xl', `bg-gradient-to-br ${statusDetails.accent}`)} />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <svg width="110" height="110" viewBox="0 0 110 110" className="rotate-[-90deg]">
                <circle
                  cx="55"
                  cy="55"
                  r={RADIUS}
                  strokeWidth="12"
                  className="text-white/10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <motion.circle
                  cx="55"
                  cy="55"
                  r={RADIUS}
                  strokeWidth="12"
                  strokeLinecap="round"
                  stroke="url(#context-progress-line)"
                  fill="transparent"
                  style={{ strokeDasharray: CIRCUMFERENCE }}
                  initial={{ strokeDashoffset: CIRCUMFERENCE }}
                  animate={{ strokeDashoffset: CIRCUMFERENCE - (CIRCUMFERENCE * usagePercentage) / 100 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="context-progress-line" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#2dd4bf" />
                    <stop offset="45%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  key={usagePercentage}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="text-3xl font-semibold leading-none text-white"
                >
                  {tokens ? `${usagePercentage}%` : '--'}
                </motion.span>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                <StatusIcon className="h-3.5 w-3.5" />
                <span>{statusDetails.label}</span>
              </div>
              <p className="mt-3 text-base font-semibold text-white">Context window</p>
              <p className="mt-1 text-xs text-white/70">
                {isCalculating ? 'Refreshing usage metrics…' : statusDetails.subtext}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80">
                  <p className="text-[11px] uppercase tracking-wide text-white/50">Used</p>
                  <p className="mt-1 text-lg font-semibold text-white">{tokens ? FORMATTER.format(tokens.totalTokens) : '—'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80">
                  <p className="text-[11px] uppercase tracking-wide text-white/50">Remaining</p>
                  <p className="mt-1 text-lg font-semibold text-white">{FORMATTER.format(remainingTokens)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/80">
                  <p className="text-[11px] uppercase tracking-wide text-white/50">Total</p>
                  <p className="mt-1 text-lg font-semibold text-white">{FORMATTER.format(LIMIT)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 text-right text-[11px] uppercase tracking-[0.2em] text-white/40">
            <span>Last updated</span>
            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm font-semibold text-white">
              {tokens ? tokens.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
          </div>
        </div>

        <div className="grid gap-3 text-xs text-white/80">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Breakdown</p>
            <div className="mt-3 space-y-2">
              {breakdown.map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className={cn('flex items-center gap-2 font-medium', item.accent)}>
                    <span className="h-2.5 w-2.5 rounded-full border" />
                    {item.label}
                  </span>
                  <span className="tabular-nums text-white/70">
                    {FORMATTER.format(item.value)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-white/60">
                <span className="flex items-center gap-2 text-xs font-medium text-emerald-200">
                  <span className="h-2.5 w-2.5 rounded-full border border-emerald-500/40" />
                  Reserved for AI response
                </span>
                <span className="tabular-nums">{FORMATTER.format(RESERVED_FOR_RESPONSE)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-white/40">
              <span>Usage Trend</span>
              <span>{tokens ? `${usagePercentage}% of limit` : 'Awaiting data'}</span>
            </div>
            <div className="mt-3 flex items-end gap-1">
              {historyBars.map((value, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-full bg-gradient-to-t from-cyan-500/10 via-emerald-400/30 to-teal-200/70"
                  style={{ height: `${Math.round(value * 42)}px` }}
                />
              ))}
            </div>
            <p className="mt-3 text-xs text-white/60">
              We automatically reserve <span className="text-white/90">{FORMATTER.format(RESERVED_FOR_RESPONSE)} tokens</span> for the next AI answer to prevent cut-offs.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

ContextUsageCard.displayName = 'ContextUsageCard'
