'use client'

import Dexie, { type EntityTable } from 'dexie'

// Local database schema for t3.chat-style performance
export interface LocalMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  citations?: Array<{
    title: string
    url: string
    snippet: string
  }>
  metadata?: {
    model?: string
    tokens?: number
    duration?: number
  }
}

export interface LocalConversation {
  id: string
  documentId?: string
  title: string
  lastMessageAt: number
  messageCount: number
  createdAt: number
  updatedAt: number
}

export interface LocalDocument {
  id: string
  title: string
  sections: Array<{
    id: string
    title: string
    content: string
    level: number
  }>
  cachedAt: number
}

export interface LocalChatSettings {
  id: string
  selectedModel: string
  autoScroll: boolean
  soundEnabled: boolean
  theme: string
  lastUpdated: number
}

// High-performance IndexedDB database
export class LocalChatDatabase extends Dexie {
  messages!: EntityTable<LocalMessage, 'id'>
  conversations!: EntityTable<LocalConversation, 'id'>
  documents!: EntityTable<LocalDocument, 'id'>
  settings!: EntityTable<LocalChatSettings, 'id'>

  constructor() {
    super('CogniLeapChatDB')

    this.version(1).stores({
      // Optimized indexes for lightning-fast queries
      messages: 'id, conversationId, timestamp, role',
      conversations: 'id, documentId, lastMessageAt, title',
      documents: 'id, cachedAt',
      settings: 'id'
    })
  }

  // High-performance message operations
  async getConversationMessages(conversationId: string): Promise<LocalMessage[]> {
    return this.messages
      .where('conversationId')
      .equals(conversationId)
      .sortBy('timestamp')
  }

  async addMessage(message: Omit<LocalMessage, 'timestamp'>): Promise<string> {
    const messageWithTimestamp: LocalMessage = {
      ...message,
      timestamp: Date.now()
    }

    // Atomic transaction for consistency
    return this.transaction('rw', [this.messages, this.conversations], async () => {
      await this.messages.add(messageWithTimestamp)

      // Update conversation metadata
      await this.conversations.update(message.conversationId, {
        lastMessageAt: messageWithTimestamp.timestamp,
        updatedAt: messageWithTimestamp.timestamp,
        messageCount: await this.messages.where('conversationId').equals(message.conversationId).count()
      })

      return message.id
    })
  }

  async updateMessage(id: string, updates: Partial<LocalMessage>): Promise<void> {
    await this.messages.update(id, {
      ...updates,
      timestamp: Date.now()
    })
  }

  async createConversation(conversation: Omit<LocalConversation, 'createdAt' | 'updatedAt'>): Promise<string> {
    const now = Date.now()
    const conversationWithTimestamps: LocalConversation = {
      ...conversation,
      createdAt: now,
      updatedAt: now
    }

    await this.conversations.add(conversationWithTimestamps)
    return conversation.id
  }

  async getRecentConversations(limit = 20): Promise<LocalConversation[]> {
    return this.conversations
      .orderBy('lastMessageAt')
      .reverse()
      .limit(limit)
      .toArray()
  }

  async searchConversations(query: string): Promise<LocalConversation[]> {
    return this.conversations
      .filter(conv =>
        conv.title.toLowerCase().includes(query.toLowerCase())
      )
      .toArray()
  }

  async cacheDocument(document: Omit<LocalDocument, 'cachedAt'>): Promise<void> {
    const documentWithCache: LocalDocument = {
      ...document,
      cachedAt: Date.now()
    }

    await this.documents.put(documentWithCache)
  }

  async getDocument(id: string): Promise<LocalDocument | undefined> {
    return this.documents.get(id)
  }

  async updateSettings(settings: Partial<LocalChatSettings>): Promise<void> {
    const defaultId = 'default'
    const existingSettings = await this.settings.get(defaultId)

    const updatedSettings: LocalChatSettings = {
      id: defaultId,
      selectedModel: 'FLASH',
      autoScroll: true,
      soundEnabled: false,
      theme: 'light',
      lastUpdated: Date.now(),
      ...existingSettings,
      ...settings
    }

    await this.settings.put(updatedSettings)
  }

  async getSettings(): Promise<LocalChatSettings> {
    const settings = await this.settings.get('default')

    if (!settings) {
      const defaultSettings: LocalChatSettings = {
        id: 'default',
        selectedModel: 'FLASH',
        autoScroll: true,
        soundEnabled: false,
        theme: 'light',
        lastUpdated: Date.now()
      }

      await this.settings.add(defaultSettings)
      return defaultSettings
    }

    return settings
  }

  // Cleanup old data for performance
  async cleanupOldMessages(daysOld = 30): Promise<number> {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    return this.messages.where('timestamp').below(cutoffDate).delete()
  }

  async cleanupOldDocuments(daysOld = 7): Promise<number> {
    const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000)
    return this.documents.where('cachedAt').below(cutoffDate).delete()
  }
}

// Singleton instance for optimal performance
export const localDB = new LocalChatDatabase()