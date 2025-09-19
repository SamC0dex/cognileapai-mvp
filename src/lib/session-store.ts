/**
 * Simple Database Session Persistence
 * Stores session data in Supabase to survive server restarts
 */

import { createClient } from '@supabase/supabase-js'
import type { GeminiModelKey } from './ai-config'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface PersistedChatSession {
  id: string
  conversation_id: string
  model_key: GeminiModelKey
  system_prompt: string
  document_context?: string
  conversation_history: Array<{
    role: 'user' | 'model'
    parts: Array<{ text: string }>
  }>
  created_at: string
  last_activity_at: string
}

/**
 * Save session to database
 */
export async function saveSession(session: {
  id: string
  conversationId: string
  modelKey: GeminiModelKey
  systemPrompt: string
  documentContext?: string
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .upsert({
        id: session.id,
        conversation_id: session.conversationId,
        model_key: session.modelKey,
        system_prompt: session.systemPrompt,
        document_context: session.documentContext,
        conversation_history: session.history,
        last_activity_at: new Date().toISOString()
      })

    if (error) {
      console.error('[SessionStore] Failed to save session:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[SessionStore] Save session error:', error)
    return false
  }
}

/**
 * Load session from database
 */
export async function loadSession(sessionId: string): Promise<PersistedChatSession | null> {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[SessionStore] Load session error:', error)
    return null
  }
}

/**
 * Find session by conversation ID
 */
export async function findSessionByConversation(conversationId: string): Promise<PersistedChatSession | null> {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('last_activity_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('[SessionStore] Find session error:', error)
    return null
  }
}

/**
 * Update session activity
 */
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    await supabase
      .from('chat_sessions')
      .update({ last_activity_at: new Date().toISOString() })
      .eq('id', sessionId)
  } catch (error) {
    console.error('[SessionStore] Update activity error:', error)
  }
}

/**
 * Clean up old sessions
 */
export async function cleanupOldSessions(): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

    const { error, count } = await supabase
      .from('chat_sessions')
      .delete()
      .lt('last_activity_at', cutoffDate.toISOString())

    if (error) {
      console.error('[SessionStore] Cleanup error:', error)
      return 0
    }

    console.log(`[SessionStore] Cleaned up ${count || 0} old sessions`)
    return count || 0
  } catch (error) {
    console.error('[SessionStore] Cleanup error:', error)
    return 0
  }
}