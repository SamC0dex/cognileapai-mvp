"use client"

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getThreads, searchThreads, deleteThread, renameThread, toggleStarThread, type ChatThread } from '@/lib/chat-history'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui'

interface ChatHistoryDrawerProps {
  open: boolean
  onClose: () => void
  onSelectThread?: (thread: ChatThread) => void
  onNewChat?: () => void
  currentConversationId?: string | null
  onCurrentChatDeleted?: () => void
}

export function ChatHistoryDrawer({
  open,
  onClose,
  onSelectThread,
  currentConversationId,
  onCurrentChatDeleted
}: ChatHistoryDrawerProps) {
  const [query, setQuery] = useState("")
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [filteredThreads, setFilteredThreads] = useState<ChatThread[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const newThreads = await getThreads()
      setThreads(newThreads)
    } catch (error) {
      console.error('Failed to load chat threads:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const updateFiltered = useCallback(async () => {
    if (query) {
      try {
        const results = await searchThreads(query)
        setFilteredThreads(results)
      } catch (error) {
        console.error('Failed to search threads:', error)
        setFilteredThreads([])
      }
    } else {
      setFilteredThreads(threads)
    }
  }, [query, threads])

  useEffect(() => {
    refresh()
    const handler = () => refresh()
    window.addEventListener('chat:threads:changed', handler)
    return () => window.removeEventListener('chat:threads:changed', handler)
  }, [refresh])

  useEffect(() => {
    updateFiltered()
  }, [updateFiltered])

  const handleSelect = (t: ChatThread) => {
    onSelectThread?.(t)
    onClose()
  }

  const handleDelete = async (id: string) => {
    // Check if we're deleting the currently active chat
    const isDeletingCurrentChat = currentConversationId === id

    try {
      await deleteThread(id)
      await refresh()

      // If we deleted the current chat, trigger redirect
      if (isDeletingCurrentChat && onCurrentChatDeleted) {
        onCurrentChatDeleted()
      }
    } catch (error) {
      console.error('Failed to delete thread:', error)
    }
  }

  const handleRename = async (id: string, newTitle: string) => {
    if (!newTitle.trim()) return

    try {
      await renameThread(id, newTitle)
      await refresh()
      setEditingId(null)
      setEditingTitle("")
    } catch (error) {
      console.error('Failed to rename thread:', error)
    }
  }

  const handleToggleStar = async (id: string) => {
    try {
      await toggleStarThread(id)
      await refresh()
    } catch (error) {
      console.error('Failed to toggle star:', error)
    }
  }

  const startEditing = (thread: ChatThread) => {
    setEditingId(thread.id)
    setEditingTitle(thread.title)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleRename(id, editingTitle)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
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
            className="fixed right-0 top-0 bottom-0 z-[310] w-[320px] sm:w-[360px] bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--background)/0.96)] border-l border-border shadow-2xl flex flex-col"
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
              <div className="px-1 text-xs font-medium text-primary/80">Today</div>
              {loading && (
                <div className="text-sm text-muted-foreground px-1 py-8">Loading threads...</div>
              )}
              {!loading && filteredThreads.length === 0 && (
                <div className="text-sm text-muted-foreground px-1 py-8">No threads yet.</div>
              )}
              {filteredThreads.map(t => (
                <motion.div
                  key={t.id}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative w-full rounded-xl bg-muted/40 hover:bg-muted/60 border border-border/80 hover:border-primary/20 transition-all group"
                >
                  {/* Main thread content button - exclude dropdown area */}
                  <button
                    onClick={() => editingId === t.id ? undefined : handleSelect(t)}
                    className="w-full text-left p-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40"
                    aria-label={`Open chat: ${t.title || 'Untitled'}`}
                    disabled={editingId === t.id}
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {/* Star indicator */}
                          {t.isStarred && (
                            <svg className="w-3 h-3 text-amber-500 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                          )}

                          {/* Title - editable or display */}
                          {editingId === t.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, t.id)}
                              onBlur={() => handleRename(t.id, editingTitle)}
                              className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0 p-0"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <div className="text-sm font-medium truncate">{t.title || 'Untitled'}</div>
                          )}
                        </div>
                        {t.preview && editingId !== t.id && (
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{t.preview}</div>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* 3-dot dropdown menu - positioned outside main button */}
                  <div className="absolute top-2 right-2 z-50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="text-foreground/60 hover:text-foreground transition-colors p-2 rounded-md hover:bg-accent/30"
                          aria-label="Thread options"
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('3-dot button clicked!')
                          }}
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2"/>
                            <circle cx="12" cy="12" r="2"/>
                            <circle cx="12" cy="19" r="2"/>
                          </svg>
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 z-[9999]" sideOffset={5}>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Rename clicked')
                            startEditing(t)
                          }}
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Star toggle clicked')
                            handleToggleStar(t.id)
                          }}
                        >
                          {t.isStarred ? (
                            <>
                              <svg className="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              Unstar
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                              </svg>
                              Star
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('Delete clicked')
                            handleDelete(t.id)
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 7h12M10 11v6m4-6v6M9 7l1-2h4l1 2m-8 0l1 12a2 2 0 002 2h4a2 2 0 002-2l1-12" />
                          </svg>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
