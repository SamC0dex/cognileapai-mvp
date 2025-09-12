"use client"

import { useEffect, useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getThreads, searchThreads, deleteThread, type ChatThread } from '@/lib/chat-history'

interface ChatHistoryDrawerProps {
  open: boolean
  onClose: () => void
  onSelectThread?: (thread: ChatThread) => void
  onNewChat?: () => void
}

export function ChatHistoryDrawer({ open, onClose, onSelectThread, onNewChat }: ChatHistoryDrawerProps) {
  const [query, setQuery] = useState("")
  const [threads, setThreads] = useState<ChatThread[]>([])

  const refresh = useCallback(() => setThreads(getThreads()), [])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('chat:threads:changed', handler)
    return () => window.removeEventListener('chat:threads:changed', handler)
  }, [refresh])

  const filtered = useMemo(() => query ? searchThreads(query) : threads, [query, threads])

  const handleSelect = (t: ChatThread) => {
    onSelectThread?.(t)
    onClose()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteThread(id)
    refresh()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 bg-black z-[300]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="drawer-panel"
            initial={{ x: 360 }}
            animate={{ x: 0 }}
            exit={{ x: 360 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed right-0 top-0 bottom-0 z-[310] w-[320px] sm:w-[360px] bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--background)/0.96)] border-l border-border shadow-2xl"
          >
            <div className="h-14 px-4 flex items-center justify-between border-b border-border">
              <div className="text-sm font-semibold">Chat History</div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Close history"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-border">
              <div className="relative">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search your threads..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
              <div className="px-1 text-xs font-medium text-primary/80">Today</div>
              {filtered.length === 0 && (
                <div className="text-sm text-muted-foreground px-1 py-8">No threads yet.</div>
              )}
              {filtered.map(t => (
                <motion.button
                  key={t.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(t)}
                  className="w-full text-left p-3 rounded-xl bg-muted/40 hover:bg-muted/60 border border-border/80 hover:border-primary/20 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t.title || 'Untitled'}</div>
                      {t.preview && (
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{t.preview}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, t.id)}
                      className="opacity-70 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-muted"
                      aria-label="Delete thread"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M10 11v6m4-6v6M9 7l1-2h4l1 2m-8 0l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" />
                      </svg>
                    </button>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border">
              <button
                onClick={() => { onNewChat?.(); onClose() }}
                className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition dark:bg-gradient-to-r dark:from-teal-600 dark:to-teal-700 dark:hover:from-teal-700 dark:hover:to-teal-800"
              >
                New Chat
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
