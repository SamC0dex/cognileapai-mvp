"use client"

import { createClient } from '@supabase/supabase-js'

export type ChatThread = {
  id: string
  title: string
  documentId?: string | null
  preview?: string
  createdAt: number
  updatedAt: number
  messagesCount: number
  isStarred?: boolean
}

const STORAGE_KEY = "cognileap:threads"

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function loadFromLocalStorage(): ChatThread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatThread[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveToLocalStorage(threads: ChatThread[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
  } catch {
    // ignore write errors
  }
}

async function loadFromDatabase(): Promise<ChatThread[]> {
  try {
    // First get conversations
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        document_id,
        is_starred,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })

    if (convError) {
      console.warn('[Chat History] Failed to load conversations from database:', convError.message)
      return []
    }

    if (!conversations || conversations.length === 0) {
      return []
    }

    // Get message counts for each conversation
    const conversationIds = conversations.map(c => c.id)
    const { data: messageCounts, error: countError } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)

    if (countError) {
      console.warn('[Chat History] Failed to load message counts:', countError.message)
    }

    // Count messages per conversation
    const messageCountMap = new Map<string, number>()
    if (messageCounts) {
      messageCounts.forEach(msg => {
        const current = messageCountMap.get(msg.conversation_id) || 0
        messageCountMap.set(msg.conversation_id, current + 1)
      })
    }

    // Get preview from first user message of each conversation
    const previewPromises = conversations.map(async (conv) => {
      try {
        const { data: firstMessage } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .eq('role', 'user')
          .order('sequence_number', { ascending: true })
          .limit(1)
          .single()

        return {
          id: conv.id,
          preview: firstMessage?.content?.slice(0, 100) || ''
        }
      } catch {
        return { id: conv.id, preview: '' }
      }
    })

    const previews = await Promise.all(previewPromises)
    const previewMap = new Map(previews.map(p => [p.id, p.preview]))

    return conversations.map(conv => ({
      id: conv.id,
      title: conv.title || 'Untitled Conversation',
      documentId: conv.document_id,
      preview: previewMap.get(conv.id) || '',
      createdAt: new Date(conv.created_at).getTime(),
      updatedAt: new Date(conv.updated_at).getTime(),
      messagesCount: messageCountMap.get(conv.id) || 0,
      isStarred: conv.is_starred || false
    }))
  } catch (error) {
    console.warn('[Chat History] Database error:', error)
    return []
  }
}

export async function getThreads(): Promise<ChatThread[]> {
  // Always prioritize database data to ensure consistency
  const dbThreads = await loadFromDatabase()

  // Clear localStorage and use fresh database data
  saveToLocalStorage(dbThreads)
  return dbThreads.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function upsertThread(thread: ChatThread) {
  // For now, keep localStorage behavior for local thread updates
  // Database updates happen through the chat store
  const threads = loadFromLocalStorage()
  const idx = threads.findIndex(t => t.id === thread.id)
  if (idx >= 0) threads[idx] = { ...threads[idx], ...thread }
  else threads.push(thread)
  saveToLocalStorage(threads)
  window.dispatchEvent(new CustomEvent("chat:threads:changed"))
}

export function touchThread(id: string, updates: Partial<ChatThread>) {
  // For now, keep localStorage behavior for local thread updates
  const threads = loadFromLocalStorage()
  const idx = threads.findIndex(t => t.id === id)
  if (idx >= 0) {
    threads[idx] = { ...threads[idx], ...updates, updatedAt: Date.now() }
    saveToLocalStorage(threads)
    window.dispatchEvent(new CustomEvent("chat:threads:changed"))
  }
}

export async function deleteThread(id: string) {
  try {
    // Try to delete from database first
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) {
      console.warn('[Chat History] Failed to delete from database:', error.message)
    }
  } catch (error) {
    console.warn('[Chat History] Database error during delete:', error)
  }

  // Always delete from localStorage as well
  const threads = loadFromLocalStorage().filter(t => t.id !== id)
  saveToLocalStorage(threads)
  window.dispatchEvent(new CustomEvent("chat:threads:changed"))
}

export async function renameThread(id: string, newTitle: string) {
  try {
    // Update in database first
    const { error } = await supabase
      .from('conversations')
      .update({
        title: newTitle.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.warn('[Chat History] Failed to rename in database:', error.message)
    }
  } catch (error) {
    console.warn('[Chat History] Database error during rename:', error)
  }

  // Update in localStorage as well
  const threads = loadFromLocalStorage()
  const idx = threads.findIndex(t => t.id === id)
  if (idx >= 0) {
    threads[idx] = {
      ...threads[idx],
      title: newTitle.trim(),
      updatedAt: Date.now()
    }
    saveToLocalStorage(threads)
    window.dispatchEvent(new CustomEvent("chat:threads:changed"))
  }
}

export async function toggleStarThread(id: string) {
  try {
    // Get current starred state from database
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('is_starred')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.warn('[Chat History] Failed to fetch starred state:', fetchError.message)
      return
    }

    const newStarredState = !conversation.is_starred

    // Update in database
    const { error } = await supabase
      .from('conversations')
      .update({
        is_starred: newStarredState,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.warn('[Chat History] Failed to toggle star in database:', error.message)
    }
  } catch (error) {
    console.warn('[Chat History] Database error during star toggle:', error)
  }

  // Update in localStorage as well
  const threads = loadFromLocalStorage()
  const idx = threads.findIndex(t => t.id === id)
  if (idx >= 0) {
    threads[idx] = {
      ...threads[idx],
      isStarred: !threads[idx].isStarred,
      updatedAt: Date.now()
    }
    saveToLocalStorage(threads)
    window.dispatchEvent(new CustomEvent("chat:threads:changed"))
  }
}

export async function searchThreads(query: string): Promise<ChatThread[]> {
  const q = query.trim().toLowerCase()
  const threads = await getThreads()
  if (!q) return threads
  return threads.filter(t =>
    t.title.toLowerCase().includes(q) || (t.preview || "").toLowerCase().includes(q)
  )
}

export function createThreadId() {
  return crypto.randomUUID()
}

