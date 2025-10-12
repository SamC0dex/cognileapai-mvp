'use client'

import React from 'react'
import { AlertTriangle, ShieldAlert, Lock, Clock3, Bot, WifiOff, PenTool, FileText, Database, BookOpen, Mail, RefreshCcw, Upload, X, Home } from 'lucide-react'
import type { UserFacingError, ErrorAction } from '@/lib/errors/types'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const iconMap = {
  warning: AlertTriangle,
  shield: ShieldAlert,
  lock: Lock,
  clock: Clock3,
  robot: Bot,
  wifi: WifiOff,
  pencil: PenTool,
  doc: FileText,
  database: Database,
  book: BookOpen
} as const

const actionIconMap = {
  support: Mail,
  retry: RefreshCcw,
  upload: Upload,
  signin: Lock,
  dismiss: X,
  refresh: RefreshCcw,
  lock: Lock,
  contact: Mail,
  home: Home,
  book: BookOpen
} as const

interface ActionableErrorPanelProps {
  error: UserFacingError
  countdownSeconds?: number | null
  onAction: (action: ErrorAction) => void
}

export function ActionableErrorPanel({ error, countdownSeconds, onAction }: ActionableErrorPanelProps) {
  const IconComponent = iconMap[error.icon] || AlertTriangle

  return (
    <div className="mx-4 my-3 rounded-2xl border border-border/60 bg-background/95 backdrop-blur p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2">
          <IconComponent className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-base font-semibold text-foreground">{error.title}</h3>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            {typeof countdownSeconds === 'number' && countdownSeconds > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Please wait {countdownSeconds} second{countdownSeconds === 1 ? '' : 's'} before trying again.
              </p>
            )}
            {error.details && (
              <p className="text-xs text-muted-foreground/80 mt-2">{error.details}</p>
            )}
          </div>

          {error.actions.some(action => !action.auto) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {error.actions.filter(action => !action.auto).map(action => {
                const ActionIcon = action.icon ? actionIconMap[action.icon] || RefreshCcw : undefined
                const buttonVariant = action.variant === 'primary'
                  ? 'default'
                  : action.variant ?? 'default'
                return (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={buttonVariant}
                    onClick={() => onAction(action)}
                    className={cn('text-xs', buttonVariant === 'ghost' && 'hover:bg-muted')}
                  >
                    {ActionIcon && <ActionIcon className="mr-1.5 h-3.5 w-3.5" />}
                    {action.label}
                  </Button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
