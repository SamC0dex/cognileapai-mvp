"use client"

export type ChatThread = {
  id: string
  title: string
  documentId?: string | null
  preview?: string
  createdAt: number
  updatedAt: number
  messagesCount: number
}

const STORAGE_KEY = "cognileap:threads"

function load(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatThread[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function save(threads: ChatThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
  } catch {
    // ignore write errors
  }
}

export function getThreads(): ChatThread[] {
  return load().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function upsertThread(thread: ChatThread) {
  const threads = load()
  const idx = threads.findIndex(t => t.id === thread.id)
  if (idx >= 0) threads[idx] = { ...threads[idx], ...thread }
  else threads.push(thread)
  save(threads)
  window.dispatchEvent(new CustomEvent("chat:threads:changed"))
}

export function touchThread(id: string, updates: Partial<ChatThread>) {
  const threads = load()
  const idx = threads.findIndex(t => t.id === id)
  if (idx >= 0) {
    threads[idx] = { ...threads[idx], ...updates, updatedAt: Date.now() }
    save(threads)
    window.dispatchEvent(new CustomEvent("chat:threads:changed"))
  }
}

export function deleteThread(id: string) {
  const threads = load().filter(t => t.id !== id)
  save(threads)
  window.dispatchEvent(new CustomEvent("chat:threads:changed"))
}

export function searchThreads(query: string): ChatThread[] {
  const q = query.trim().toLowerCase()
  if (!q) return getThreads()
  return getThreads().filter(t =>
    t.title.toLowerCase().includes(q) || (t.preview || "").toLowerCase().includes(q)
  )
}

export function createThreadId() {
  return crypto.randomUUID()
}

