"use client"

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type StudyToolType = 'study-guide' | 'flashcards' | 'smart-notes' | 'smart-summary'

export interface StudyToolContent {
  id: string
  type: StudyToolType
  title: string
  content: string
  createdAt: Date
  documentId?: string
  conversationId?: string
  isGenerating?: boolean
  generationProgress?: number
}

export interface StudyTool {
  name: string
  description: string
  icon: string
  color: string
  borderColor: string
  textColor: string
  disabled?: boolean
}

export const STUDY_TOOLS: Record<StudyToolType, StudyTool> = {
  'study-guide': {
    name: 'Study Guide',
    description: 'Comprehensive overview with key concepts',
    icon: '📚',
    color: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300'
  },
  'flashcards': {
    name: 'Flashcards',
    description: 'Interactive Q&A cards for memorization (Coming Soon)',
    icon: '📄',
    color: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-300',
    disabled: true
  },
  'smart-notes': {
    name: 'Smart Notes',
    description: 'Organized notes with key insights',
    icon: '📝',
    color: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-800',
    textColor: 'text-purple-700 dark:text-purple-300'
  },
  'smart-summary': {
    name: 'Smart Summary',
    description: 'Concise overview of main points',
    icon: '⚡',
    color: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300'
  }
} as const

interface StudyToolsStore {
  // Panel state
  isPanelExpanded: boolean
  expandPanel: () => void
  collapsePanel: () => void
  togglePanel: () => void

  // Canvas state
  isCanvasOpen: boolean
  canvasContent: StudyToolContent | null
  openCanvas: (content: StudyToolContent) => void
  closeCanvas: () => void

  // Generation state
  isGenerating: boolean
  generatingType: StudyToolType | null
  generationProgress: number
  error: string | null
  generateStudyTool: (type: StudyToolType, documentId?: string, conversationId?: string) => Promise<void>

  // Content management
  generatedContent: StudyToolContent[]
  addGeneratedContent: (content: StudyToolContent) => void
  removeGeneratedContent: (id: string) => void
  renameGeneratedContent: (id: string, newTitle: string) => void
  clearGeneratedContent: () => void

  // Database functions
  loadStudyToolsFromDatabase: (documentId?: string, conversationId?: string) => Promise<void>

  // Export functions
  copyToClipboard: (content: string) => Promise<boolean>
  downloadAsPDF: (content: StudyToolContent) => Promise<void>
  downloadAsDOCX: (content: StudyToolContent) => Promise<void>
}

export const useStudyToolsStore = create<StudyToolsStore>()(
  persist(
    (set, get) => ({
  // Panel state
  isPanelExpanded: false,
  expandPanel: () => set({ isPanelExpanded: true }),
  collapsePanel: () => set({ isPanelExpanded: false }),
  togglePanel: () => set(state => ({ isPanelExpanded: !state.isPanelExpanded })),

  // Canvas state
  isCanvasOpen: false,
  canvasContent: null,
  openCanvas: (content: StudyToolContent) => {
    console.log('[StudyToolsStore] Opening canvas with content:', content)
    set({ canvasContent: content, isCanvasOpen: true })
  },
  closeCanvas: () => {
    set({ isCanvasOpen: false })
    // Don't clear content immediately to allow for smooth animation
    setTimeout(() => set({ canvasContent: null }), 300)
  },

  // Generation state
  isGenerating: false,
  generatingType: null,
  generationProgress: 0,
  error: null,
  generateStudyTool: async (
    type: StudyToolType,
    documentId?: string,
    conversationId?: string
  ) => {
    try {
      console.log('[StudyToolsStore] Starting generation:', { type, documentId, conversationId })

      // Create placeholder content immediately for smooth UX
      const placeholderContent: StudyToolContent = {
        id: crypto.randomUUID(),
        type,
        title: `Generating ${STUDY_TOOLS[type].name}...`,
        content: '',
        createdAt: new Date(),
        documentId,
        conversationId,
        isGenerating: true,
        generationProgress: 0
      }

      // Add placeholder to list immediately
      set(state => ({
        isGenerating: true,
        generatingType: type,
        generationProgress: 0,
        error: null,
        generatedContent: [placeholderContent, ...state.generatedContent]
      }))

      // Simulate progress updates on the placeholder
      const progressInterval = setInterval(() => {
        set(state => {
          const updatedContent = state.generatedContent.map(content =>
            content.id === placeholderContent.id
              ? { ...content, generationProgress: Math.min((content.generationProgress || 0) + Math.random() * 15, 90) }
              : content
          )
          return {
            generatedContent: updatedContent,
            generationProgress: Math.min(state.generationProgress + Math.random() * 15, 90)
          }
        })
      }, 300)

      const response = await fetch('/api/study-tools/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          documentId,
          conversationId,
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(`Failed to generate ${STUDY_TOOLS[type].name}`)
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Generation successful:', result)

      const finalContent: StudyToolContent = {
        ...placeholderContent,
        id: result.id || placeholderContent.id, // Use database ID if available
        title: result.title || STUDY_TOOLS[type].name,
        content: result.content,
        isGenerating: false,
        generationProgress: 100
      }

      // Update placeholder with final content
      set(state => ({
        generationProgress: 100,
        generatedContent: state.generatedContent.map(content =>
          content.id === placeholderContent.id ? finalContent : content
        )
      }))

      // Brief delay for smooth transition, then open canvas
      setTimeout(() => {
        console.log('[StudyToolsStore] Opening canvas with generated content')
        get().openCanvas(finalContent)
      }, 500)

    } catch (error) {
      console.error('[StudyToolsStore] Generation failed:', error)

      // Update placeholder to show error
      const { placeholderContent } = get() as any
      set(state => ({
        error: error instanceof Error ? error.message : 'Generation failed',
        generatedContent: state.generatedContent.map(content =>
          content.isGenerating && content.type === type
            ? { ...content, isGenerating: false, title: `Failed: ${STUDY_TOOLS[type].name}` }
            : content
        )
      }))
    } finally {
      set({
        isGenerating: false,
        generatingType: null,
        generationProgress: 0
      })
    }
  },

  // Content management
  generatedContent: [],
  addGeneratedContent: (content: StudyToolContent) => {
    set(state => ({
      generatedContent: [content, ...state.generatedContent]
    }))
  },
  removeGeneratedContent: (id: string) => {
    set(state => ({
      generatedContent: state.generatedContent.filter(content => content.id !== id)
    }))
  },
  renameGeneratedContent: (id: string, newTitle: string) => {
    set(state => ({
      generatedContent: state.generatedContent.map(content =>
        content.id === id ? { ...content, title: newTitle } : content
      )
    }))
  },
  clearGeneratedContent: () => {
    set({ generatedContent: [] })
  },

  // Database functions
  loadStudyToolsFromDatabase: async (documentId?: string, conversationId?: string) => {
    try {
      console.log('[StudyToolsStore] Loading study tools from database:', { documentId, conversationId })

      if (!documentId && !conversationId) {
        console.warn('[StudyToolsStore] No documentId or conversationId provided for database loading')
        return
      }

      const response = await fetch('/api/study-tools/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          conversationId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch study tools: ${response.status}`)
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Loaded study tools from database:', result)

      if (result.success && result.studyTools && result.studyTools.length > 0) {
        // Merge database content with existing content, avoiding duplicates
        set(state => {
          const existingIds = new Set(state.generatedContent.map(content => content.id))
          const newContent = result.studyTools.filter((tool: StudyToolContent) => !existingIds.has(tool.id))

          return {
            generatedContent: [...newContent, ...state.generatedContent]
          }
        })
        console.log('[StudyToolsStore] Successfully merged', result.studyTools.length, 'study tools from database')
      } else {
        console.log('[StudyToolsStore] No study tools found in database')
      }

    } catch (error) {
      console.error('[StudyToolsStore] Failed to load study tools from database:', error)
    }
  },

  // Export functions
  copyToClipboard: async (content: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(content)
      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return false
    }
  },

  downloadAsPDF: async (content: StudyToolContent): Promise<void> => {
    try {
      // Simple print-based PDF generation
      const printWindow = window.open('', '_blank')
      if (!printWindow) throw new Error('Could not open print window')

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${content.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              h1 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
              pre { white-space: pre-wrap; word-wrap: break-word; }
            </style>
          </head>
          <body>
            <h1>${content.title}</h1>
            <pre>${content.content}</pre>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
      printWindow.close()
    } catch (error) {
      console.error('Failed to download PDF:', error)
      throw error
    }
  },

  downloadAsDOCX: async (content: StudyToolContent): Promise<void> => {
    try {
      // Simple text file download
      const blob = new Blob([content.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${content.title}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download text file:', error)
      throw error
    }
  }
}),
    {
      name: 'study-tools-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        generatedContent: state.generatedContent.map(content => ({
          ...content,
          createdAt: content.createdAt.toISOString() // Serialize Date to string
        })),
      }),
      onRehydrateStorage: () => (state) => {
        // Deserialize Date strings back to Date objects
        if (state?.generatedContent) {
          state.generatedContent = state.generatedContent.map(content => ({
            ...content,
            createdAt: new Date(content.createdAt as unknown as string)
          }))
        }
      }
    }
  )
)