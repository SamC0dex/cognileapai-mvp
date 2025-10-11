"use client"

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Tokens } from 'marked'
import type { FlashcardOptions, FlashcardSet } from '@/types/flashcards'
import {
  STUDY_TOOLS,
  type StudyToolContent,
  type StudyToolType,
  type ActiveGeneration
} from '@/lib/study-tools-shared'

export { STUDY_TOOLS }
export type { StudyToolContent, StudyToolType, ActiveGeneration }

const tightenMarkdownEmphasis = (value: string): string => {
  if (!value) return value

  let result = value
    .replace(/\*\*\s+/g, '**')
    .replace(/__(\s+)/g, '__')
    .replace(/(?<=\S)\s+\*\*/g, '**')
    .replace(/(?<=\S)\s+__/g, '__')

  result = result.replace(/\*\*([\s\S]*?)\*\*/g, (_match, inner: string) => `**${inner.trim()}**`)
  result = result.replace(/__([\s\S]*?)__/g, (_match, inner: string) => `__${inner.trim()}__`)

  return result
}

export const normalizeStudyToolMarkdown = (value: string): string => tightenMarkdownEmphasis(value)

type FlashcardStoreModule = typeof import('@/lib/flashcard-store')

interface StudyToolsStore {
  // Panel state
  isPanelExpanded: boolean
  expandPanel: () => void
  collapsePanel: () => void
  togglePanel: () => void

  // Highlighting state for dashboard navigation
  highlightedTool: StudyToolType | null
  setHighlightedTool: (tool: StudyToolType | null) => void
  clearHighlightedTool: () => void

  // Canvas state
  isCanvasOpen: boolean
  isCanvasFullscreen: boolean
  canvasContent: StudyToolContent | null
  openCanvas: (content: StudyToolContent) => Promise<void>
  closeCanvas: () => void
  toggleCanvasFullscreen: () => void

  // Generation state - Fixed for concurrent generations
  activeGenerations: Map<string, ActiveGeneration>
  activeIntervals: Map<string, NodeJS.Timeout>
  getActiveGenerations: () => ActiveGeneration[]
  isGenerating: boolean // Proper reactive state, not computed
  isGeneratingType: (type: StudyToolType) => boolean
  generatingType: StudyToolType | null // Proper reactive state, not computed
  generationProgress: number // Proper reactive state, not computed
  error: string | null
  generateStudyTool: (type: StudyToolType, documentId?: string, conversationId?: string, flashcardOptions?: FlashcardOptions) => Promise<void>
  _updateGenerationState: () => void // Internal helper

  // Content management
  generatedContent: StudyToolContent[]
  addGeneratedContent: (content: StudyToolContent) => void
  removeGeneratedContent: (id: string) => Promise<void>
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

  // Highlighting state for dashboard navigation
  highlightedTool: null,
  setHighlightedTool: (tool: StudyToolType | null) => set({ highlightedTool: tool }),
  clearHighlightedTool: () => set({ highlightedTool: null }),

  // Canvas state
  isCanvasOpen: false,
  isCanvasFullscreen: false,
  canvasContent: null,
  openCanvas: async (content: StudyToolContent) => {
    console.log('[StudyToolsStore] Opening canvas with content:', content)

    // Close flashcard viewer when opening canvas (mutual exclusion)
    try {
      const { useFlashcardStore } = await import('@/lib/flashcard-store')
      const flashcardStore = useFlashcardStore.getState()
      if (flashcardStore.isViewerOpen) {
        flashcardStore.closeViewer()
      }
    } catch (error) {
      console.warn('[StudyToolsStore] Could not close flashcard viewer:', error)
    }

    set({ canvasContent: content, isCanvasOpen: true })
  },
  closeCanvas: () => {
    set({ isCanvasOpen: false, isCanvasFullscreen: false })
    // Don't clear content immediately to allow for smooth animation
    setTimeout(() => set({ canvasContent: null }), 300)
  },
  toggleCanvasFullscreen: () => {
    set(state => ({
      isCanvasFullscreen: !state.isCanvasFullscreen
    }))
  },

  // Generation state - Fixed for concurrent generations
  activeGenerations: new Map(),
  activeIntervals: new Map(),
  getActiveGenerations: () => Array.from(get().activeGenerations.values()),
  isGenerating: false, // Proper reactive state
  isGeneratingType: (type: StudyToolType) => {
    const generations = get().activeGenerations
    return Array.from(generations.values()).some(gen => gen.type === type)
  },
  generatingType: null, // Proper reactive state
  generationProgress: 0, // Proper reactive state
  error: null,

  _updateGenerationState: () => {
    const generations = Array.from(get().activeGenerations.values())
    const isGenerating = generations.length > 0
    const generatingType = generations.length > 0 ? generations[0].type : null
    const generationProgress = generations.length === 0 ? 0 :
      Math.round(generations.reduce((sum, gen) => sum + gen.progress, 0) / generations.length)

    set({ isGenerating, generatingType, generationProgress })
  },
  generateStudyTool: async (
    type: StudyToolType,
    documentId?: string,
    conversationId?: string,
    flashcardOptions?: FlashcardOptions
  ) => {
    console.log('[StudyToolsStore] Starting generation:', { type, documentId, conversationId })

    // Create unique generation ID and track it
    const generationId = crypto.randomUUID()

    // Prevent duplicate generations of the same type
    if (get().isGeneratingType(type)) {
      console.warn(`[StudyToolsStore] Already generating ${type}, skipping duplicate request`)
      return
    }

    let useFlashcardStoreRef: FlashcardStoreModule['useFlashcardStore'] | null = null
    const loadFlashcardStore = async () => {
      if (useFlashcardStoreRef) {
        return useFlashcardStoreRef
      }

      const flashcardStoreModule = await import('@/lib/flashcard-store')
      useFlashcardStoreRef = flashcardStoreModule.useFlashcardStore
      return useFlashcardStoreRef
    }

    try {

      // Create placeholder content immediately for smooth UX
      const placeholderContent: StudyToolContent = {
        id: generationId,
        type,
        title: `Generating ${STUDY_TOOLS[type].name}...`,
        content: '',
        createdAt: new Date(),
        documentId,
        conversationId,
        isGenerating: true,
        generationProgress: 0
      }

      // Add to active generations tracking
      const activeGeneration: ActiveGeneration = {
        id: generationId,
        type,
        startTime: Date.now(),
        progress: 0,
        status: 'starting',
        documentId,
        conversationId,
        flashcardOptions
      }

      // Update state with new generation
      set(state => {
        const newActiveGenerations = new Map(state.activeGenerations)
        newActiveGenerations.set(generationId, activeGeneration)
        return {
          activeGenerations: newActiveGenerations,
          error: null,
          generatedContent: type !== 'flashcards' ? [placeholderContent, ...state.generatedContent] : state.generatedContent
        }
      })

      // Update reactive state
      get()._updateGenerationState()

      // For flashcards, add placeholder to flashcard store instead
      if (type === 'flashcards') {
        const flashcardStoreHook = await loadFlashcardStore()
        const placeholderFlashcardSet = {
          id: placeholderContent.id,
          title: placeholderContent.title,
          cards: [],
          options: flashcardOptions || { numberOfCards: 'standard', difficulty: 'medium' },
          createdAt: placeholderContent.createdAt,
          documentId: placeholderContent.documentId,
          conversationId: placeholderContent.conversationId,
          metadata: {
            totalCards: 0,
            avgDifficulty: 'generating',
            generationTime: 0,
            model: 'gemini-2.5-pro',
            sourceContentLength: 0,
            isGenerating: true,
            generationProgress: 0
          }
        }
        flashcardStoreHook.getState().addFlashcardSet(placeholderFlashcardSet)
      }

      // Realistic AI generation progress simulation
      const getRealisticProgress = (elapsedSeconds: number, generationType: StudyToolType) => {
        // Simple, reliable progress calculation designed for 30-45 second generations
        // Phase messages based on study tool type
        const messages = {
          'study-guide': [
            { threshold: 0, message: 'Analyzing content...' },
            { threshold: 20, message: 'Creating outline...' },
            { threshold: 40, message: 'Generating sections...' },
            { threshold: 70, message: 'Adding details...' },
            { threshold: 100, message: 'Finalizing guide...' }
          ],
          'flashcards': [
            { threshold: 0, message: 'Analyzing content...' },
            { threshold: 15, message: 'Identifying key concepts...' },
            { threshold: 35, message: 'Creating questions...' },
            { threshold: 65, message: 'Generating answers...' },
            { threshold: 100, message: 'Finalizing cards...' }
          ],
          'smart-notes': [
            { threshold: 0, message: 'Reading content...' },
            { threshold: 18, message: 'Extracting key points...' },
            { threshold: 45, message: 'Organizing notes...' },
            { threshold: 80, message: 'Adding insights...' }
          ],
          'smart-summary': [
            { threshold: 0, message: 'Processing content...' },
            { threshold: 25, message: 'Identifying main points...' },
            { threshold: 55, message: 'Creating summary...' },
            { threshold: 85, message: 'Polishing...' }
          ]
        }

        // Calculate progress linearly with easing
        // Target: reach 90% at 100 seconds, then very slow progression to 97%
        let progress: number
        let currentMessage = messages[generationType][0].message

        if (elapsedSeconds <= 100) {
          // Smooth progression to 90% over 100 seconds with subtle easing
          // Apply gentle easing to make it feel natural
          const easingFactor = 1 - Math.pow(1 - (elapsedSeconds / 100), 1.2)
          progress = easingFactor * 90
        } else {
          // Very slow progression from 90% to 97% after 100 seconds
          const overtime = elapsedSeconds - 100
          const overtimeProgress = Math.min(overtime / 50, 1) // 50 second window for final 7%
          progress = 90 + (overtimeProgress * 7)
        }

        // Find current message based on elapsed time
        const toolMessages = messages[generationType]
        for (let i = toolMessages.length - 1; i >= 0; i--) {
          if (elapsedSeconds >= toolMessages[i].threshold) {
            currentMessage = toolMessages[i].message
            break
          }
        }

        // Ensure progress never exceeds 97% during generation
        progress = Math.min(progress, 97)

        return {
          progress: Math.round(Math.max(0, progress)),
          message: currentMessage
        }
      }

      const startTime = Date.now()
      let lastProgress = 0 // Track to ensure never going backwards
      const progressInterval = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTime) / 1000
        const { progress: newProgress, message } = getRealisticProgress(elapsedSeconds, type)
        // Ensure progress never goes backwards
        const progress = Math.max(lastProgress, newProgress)
        lastProgress = progress

        set(state => {
          // Update active generation progress
          const newActiveGenerations = new Map(state.activeGenerations)
          const currentGeneration = newActiveGenerations.get(generationId)
          if (currentGeneration) {
            newActiveGenerations.set(generationId, {
              ...currentGeneration,
              progress,
              status: progress < 95 ? 'generating' : 'finalizing'
            })
          }

          // Update placeholder content
          const updatedContent = state.generatedContent.map(content =>
            content.id === placeholderContent.id
              ? { ...content, generationProgress: progress, title: `${STUDY_TOOLS[type].name}: ${message}` }
              : content
          )

          return {
            activeGenerations: newActiveGenerations,
            generatedContent: updatedContent
          }
        })

        // Update reactive state
        get()._updateGenerationState()

        // Also update flashcard placeholder if it's a flashcard generation
        if (type === 'flashcards' && useFlashcardStoreRef) {
          const flashcardStore = useFlashcardStoreRef.getState()
          const updatedSets = flashcardStore.flashcardSets.map((set: FlashcardSet) =>
            set.id === placeholderContent.id
              ? {
                  ...set,
                  title: `Flashcards: ${message}`,
                  metadata: {
                    ...set.metadata,
                    generationProgress: progress
                  }
                }
              : set
          )
          useFlashcardStoreRef.setState({ flashcardSets: updatedSets })
        }
      }, 300)

      // Track interval for cleanup
      set(state => {
        const newActiveIntervals = new Map(state.activeIntervals)
        newActiveIntervals.set(generationId, progressInterval)
        return { activeIntervals: newActiveIntervals }
      })

      const response = await fetch('/api/study-tools/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          documentId,
          conversationId,
          ...(type === 'flashcards' && flashcardOptions ? { flashcardOptions } : {})
        }),
      })

      // Clean up interval
      clearInterval(progressInterval)
      set(state => {
        const newActiveIntervals = new Map(state.activeIntervals)
        newActiveIntervals.delete(generationId)
        return { activeIntervals: newActiveIntervals }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[StudyToolsStore] API Error:', errorData)

        // Handle specific error cases
        if (response.status === 503 || errorData.error?.includes('overloaded')) {
          throw new Error(`${STUDY_TOOLS[type].name} service is temporarily overloaded. Please try again in a few minutes.`)
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait a moment before trying again.`)
        } else if (response.status === 422) {
          throw new Error(errorData.error || `Cannot generate ${STUDY_TOOLS[type].name} - insufficient content or document still processing.`)
        } else {
          throw new Error(errorData.error || `Failed to generate ${STUDY_TOOLS[type].name}. Please try again.`)
        }
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Generation successful:', result)

      // Get current progress before completion animation
      const currentState = get()
      const currentGeneration = currentState.activeGenerations.get(generationId)
      const currentProgress = currentGeneration?.progress || 0

      // Animate progress to 100% before opening content (completion animation)
      const completeProgress = () => {
        return new Promise<void>((resolve) => {
          if (currentProgress >= 97) {
            // If already very close, just finish quickly
            setTimeout(resolve, 200)
            return
          }

          const completionInterval = setInterval(() => {
            set(state => {
              const newActiveGenerations = new Map(state.activeGenerations)
              const generation = newActiveGenerations.get(generationId)
              if (generation) {
                const progressStep = Math.min(5, 100 - generation.progress) // Speed up by 5% per step
                const newProgress = Math.min(100, generation.progress + progressStep)

                newActiveGenerations.set(generationId, {
                  ...generation,
                  progress: newProgress,
                  status: 'finalizing'
                })

                // Update placeholder content progress
                const updatedContent = state.generatedContent.map(content =>
                  content.id === placeholderContent.id
                    ? { ...content, generationProgress: newProgress, title: `${STUDY_TOOLS[type].name}: Complete!` }
                    : content
                )

                if (newProgress >= 100) {
                  clearInterval(completionInterval)
                  setTimeout(resolve, 100) // Small delay after reaching 100%
                }

                return {
                  activeGenerations: newActiveGenerations,
                  generatedContent: updatedContent
                }
              }
              return state
            })

            // Update reactive state
            get()._updateGenerationState()

            // Also update flashcard placeholder if it's a flashcard generation
            if (type === 'flashcards' && useFlashcardStoreRef) {
              const flashcardStore = useFlashcardStoreRef.getState()
              const updatedSets = flashcardStore.flashcardSets.map((set: FlashcardSet) =>
                set.id === placeholderContent.id
                  ? {
                      ...set,
                      title: `Flashcards: Complete!`,
                      metadata: {
                        ...set.metadata,
                        generationProgress: Math.min(100, (currentState.activeGenerations.get(generationId)?.progress || 0) + 5)
                      }
                    }
                  : set
              )
              useFlashcardStoreRef.setState({ flashcardSets: updatedSets })
            }
          }, 150) // Fast completion animation
        })
      }

      // Wait for completion animation to finish
      await completeProgress()

      // Handle flashcards specially
      if (type === 'flashcards' && result.cards) {
        // Import flashcard store dynamically to avoid circular deps
        const flashcardStoreHook = useFlashcardStoreRef ?? await loadFlashcardStore()

        // Create flashcard set
        const flashcardSet = {
          id: result.id || crypto.randomUUID(),
          title: result.title,
          cards: result.cards,
          options: result.options || flashcardOptions,
          createdAt: new Date(result.metadata?.generatedAt || new Date()),
          documentId,
          conversationId,
          metadata: {
            totalCards: result.cards.length,
            avgDifficulty: result.options?.difficulty || 'medium',
            generationTime: result.metadata?.duration || 0,
            model: result.metadata?.model || 'gemini-2.5-pro',
            sourceContentLength: result.metadata?.sourceContentLength || 0
          }
        }

        // Replace placeholder with final flashcard set in flashcard store
        const flashcardStore = flashcardStoreHook.getState()
        const updatedSets = flashcardStore.flashcardSets.map(set =>
          set.id === placeholderContent.id ? flashcardSet : set
        )
        flashcardStoreHook.setState({ flashcardSets: updatedSets })

        // Remove from active generations
        set(state => {
          const newActiveGenerations = new Map(state.activeGenerations)
          newActiveGenerations.delete(generationId)
          return {
            activeGenerations: newActiveGenerations
          }
        })

        // Update reactive state
        get()._updateGenerationState()

        // Brief delay then open flashcard viewer (not canvas)
        setTimeout(() => {
          console.log('[StudyToolsStore] Opening flashcard viewer')

          // Open in proper flashcard viewer instead of canvas
          flashcardStoreHook.getState().openViewer(flashcardSet)
        }, 500)

      } else {
        // Regular study tools
        const finalContent: StudyToolContent = {
          ...placeholderContent,
          id: result.id || placeholderContent.id, // Use database ID if available
          title: result.title || STUDY_TOOLS[type].name,
          content: result.content,
          isGenerating: false,
          generationProgress: 100
        }

        // Update placeholder with final content and remove from active generations
        set(state => {
          const newActiveGenerations = new Map(state.activeGenerations)
          newActiveGenerations.delete(generationId)
          return {
            activeGenerations: newActiveGenerations,
            generatedContent: state.generatedContent.map(content =>
              content.id === placeholderContent.id ? finalContent : content
            )
          }
        })

        // Update reactive state
        get()._updateGenerationState()

        // Brief delay for smooth transition, then open canvas
        setTimeout(() => {
          console.log('[StudyToolsStore] Opening canvas with generated content')
          get().openCanvas(finalContent)
        }, 500)
      }

    } catch (error) {
      console.error('[StudyToolsStore] Generation failed:', error)

      // Clean up interval if it exists
      const currentState = get()
      const progressInterval = currentState.activeIntervals.get(generationId)
      if (progressInterval) {
        clearInterval(progressInterval)
        set(state => {
          const newActiveIntervals = new Map(state.activeIntervals)
          newActiveIntervals.delete(generationId)
          return { activeIntervals: newActiveIntervals }
        })
      }

      // Update placeholder to show error and remove from active generations
      set(state => {
        const newActiveGenerations = new Map(state.activeGenerations)
        newActiveGenerations.delete(generationId)
        return {
          activeGenerations: newActiveGenerations,
          error: error instanceof Error ? error.message : 'Generation failed',
          generatedContent: state.generatedContent.map(content =>
            content.id === generationId
              ? { ...content, isGenerating: false, title: `Failed: ${STUDY_TOOLS[type].name}` }
              : content
          )
        }
      })

      // Update reactive state
      get()._updateGenerationState()

      // Also handle flashcard error cleanup
      if (type === 'flashcards') {
        const flashcardStoreHook = useFlashcardStoreRef ?? await loadFlashcardStore()
        const flashcardStore = flashcardStoreHook.getState()
        const updatedSets = flashcardStore.flashcardSets.filter((set: FlashcardSet) => set.id !== generationId)
        flashcardStoreHook.setState({ flashcardSets: updatedSets })
      }
    }
    // No finally block needed - cleanup is handled in try/catch
  },

  // Content management
  generatedContent: [],
  addGeneratedContent: (content: StudyToolContent) => {
    set(state => ({
      generatedContent: [content, ...state.generatedContent]
    }))
  },
  removeGeneratedContent: async (id: string) => {
    console.log('[StudyToolsStore] Removing generated content:', id)

    // Find the content to remove for potential rollback
    const currentState = get()
    const contentToRemove = currentState.generatedContent.find(content => content.id === id)

    if (!contentToRemove) {
      console.warn('[StudyToolsStore] Content not found in local state:', id)
      return
    }

    // Remove from local state immediately for responsive UI
    set(state => ({
      generatedContent: state.generatedContent.filter(content => content.id !== id)
    }))

    try {
      // Sync deletion with database
      const response = await fetch('/api/study-tools/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id })
      })

      console.log('[StudyToolsStore] Delete API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[StudyToolsStore] Delete API error response:', errorText)
        throw new Error(`Failed to delete from database: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Successfully deleted from database:', result)
    } catch (error) {
      console.error('[StudyToolsStore] Failed to sync deletion to database:', error)

      // Rollback: add the content back to local state since database deletion failed
      set(state => ({
        generatedContent: [contentToRemove, ...state.generatedContent].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      }))

      // Re-throw error to allow UI to show error message if needed
      throw error
    }
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

      // Allow loading all user's study tools when no specific context is provided
      // This is used by dashboard to show all user's content
      const response = await fetch('/api/study-tools/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentId || undefined,
          conversationId: conversationId || undefined,
        }),
      })

      if (!response.ok) {
        // Gracefully handle 404 - user might not have any study tools yet
        if (response.status === 404) {
          console.log('[StudyToolsStore] No study tools found (404) - user may not have any content yet')
          return
        }

        // Log other errors but don't throw to avoid breaking the UI
        console.warn(`[StudyToolsStore] Failed to fetch study tools: ${response.status}`)
        return
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Loaded study tools from database:', result)

      if (result.success && result.studyTools && result.studyTools.length > 0) {
        // Separate flashcards from regular study tools
        const flashcards: StudyToolContent[] = []
        const regularStudyTools: StudyToolContent[] = []

        result.studyTools.forEach((tool: StudyToolContent) => {
          if (tool.type === 'flashcards') {
            flashcards.push(tool)
          } else {
            regularStudyTools.push(tool)
          }
        })

        // Handle flashcards - route to flashcard store (keep existing behavior)
        if (flashcards.length > 0) {
          try {
            // Import flashcard store dynamically to avoid circular deps
            const { useFlashcardStore } = await import('@/lib/flashcard-store')

            // First, clean up any existing duplicates
            useFlashcardStore.getState().deduplicateFlashcardSets()

            for (const flashcardTool of flashcards) {
              try {
                // Parse the flashcard content
                const cleanedContent = flashcardTool.content
                  .trim()
                  .replace(/^```json\n?/, '')
                  .replace(/\n?```$/, '')
                  .trim()

                const parsedCards = JSON.parse(cleanedContent)

                if (Array.isArray(parsedCards)) {
                  // Create flashcard set and add to flashcard store
                  const flashcardSet = {
                    id: flashcardTool.id,
                    title: flashcardTool.title,
                    cards: parsedCards,
                    options: { numberOfCards: 'standard' as const, difficulty: 'medium' as const },
                    createdAt: new Date(flashcardTool.createdAt),
                    documentId: flashcardTool.documentId,
                    conversationId: flashcardTool.conversationId,
                    metadata: {
                      totalCards: parsedCards.length,
                      avgDifficulty: 'medium',
                      generationTime: 0,
                      model: 'gemini-2.5-pro',
                      sourceContentLength: 0
                    }
                  }

                  // Add to flashcard store (will show up in flashcard list)
                  useFlashcardStore.getState().addFlashcardSet(flashcardSet)
                  console.log('[StudyToolsStore] Added flashcard set to flashcard store:', flashcardTool.title)
                } else {
                  console.warn('[StudyToolsStore] Invalid flashcard format for:', flashcardTool.title)
                }
              } catch (parseError) {
                console.error('[StudyToolsStore] Failed to parse flashcard content:', parseError)
              }
            }
          } catch (importError) {
            console.error('[StudyToolsStore] Failed to import flashcard store:', importError)
          }
        }

        // Handle regular study tools - add to generatedContent
        if (regularStudyTools.length > 0) {
          set(state => {
            const existingIds = new Set(state.generatedContent.map(content => content.id))
            const newContent = regularStudyTools
              .filter((tool: StudyToolContent) => !existingIds.has(tool.id))
              .map(tool => ({
                ...tool,
                createdAt: tool.createdAt instanceof Date ? tool.createdAt : new Date(tool.createdAt)
              }))

            return {
              generatedContent: [...newContent, ...state.generatedContent]
            }
          })
          console.log('[StudyToolsStore] Successfully merged', regularStudyTools.length, 'regular study tools from database')
        }

        // Ensure flashcards are not in generatedContent (they should only be in flashcard store)
        set(state => ({
          generatedContent: state.generatedContent.filter(content => content.type !== 'flashcards')
        }))

        console.log('[StudyToolsStore] Processed', flashcards.length, 'flashcards and', regularStudyTools.length, 'regular study tools')
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
    if (content.type === 'flashcards') {
      console.warn('[StudyToolsStore] Flashcards do not support PDF export')
      throw new Error('Flashcards cannot be exported as PDF.')
    }

    try {
      const pdfMakeModule = await import('pdfmake/build/pdfmake')
      const pdfFontsModule = await import('pdfmake/build/vfs_fonts')
      const { marked } = await import('marked')

      interface PdfMakeStatic {
        vfs: Record<string, string>
        createPdf: (definition: PdfDocumentDefinition) => { download: (fileName?: string) => void }
      }

      type TextFragment =
        | string
        | {
            text: string
            bold?: boolean
            italics?: boolean
            color?: string
            link?: string
            background?: string
          }

      type PdfContent = Record<string, unknown>

      interface PdfDocumentDefinition {
        content: PdfContent[]
        styles?: Record<string, Record<string, unknown>>
        defaultStyle?: Record<string, unknown>
        pageMargins?: [number, number, number, number]
        info?: { title?: string }
      }

      const pdfMake = (pdfMakeModule.default ?? pdfMakeModule) as PdfMakeStatic
      const fontsSource = (pdfFontsModule as Record<string, unknown>).default ?? pdfFontsModule
      const virtualFileSystem =
        (fontsSource as { pdfMake?: { vfs?: Record<string, string> }; vfs?: Record<string, string> }).pdfMake?.vfs ??
        (fontsSource as { vfs?: Record<string, string> }).vfs ??
        (fontsSource as Record<string, string>)

      pdfMake.vfs = virtualFileSystem

      const tool = STUDY_TOOLS[content.type]
      const createdAt = content.createdAt

      const sanitizeIntro = (value: string): string => {
        const patterns: RegExp[] = [
          /^Of course[.,]?\s*/i,
          /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
          /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
          /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
          /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
          /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
          /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
          /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
        ]

        let cleaned = value
        for (const pattern of patterns) {
          cleaned = cleaned.replace(pattern, '')
        }
        return cleaned.replace(/^[\s*]+/, '').trim()
      }

      const EMOJI_COLON_REPLACEMENTS: Record<string, string> = {
        white_check_mark: 'Yes',
        heavy_check_mark: 'Yes',
        check_mark: 'Yes',
        ballot_box_with_check: 'Yes',
        x: 'No',
        heavy_multiplication_x: 'No',
        warning: 'Warning:',
        star: 'Highlight:',
        sparkles: 'Highlight:',
        fire: 'Hot:',
        rocket: 'Launch:',
        brain: 'Insight:',
        bulb: 'Idea:',
        idea: 'Idea:',
        dart: 'Goal:',
        link: 'Link:',
        paperclip: 'Link:',
        pushpin: '•',
        round_pushpin: '•',
        memo: 'Notes:',
        books: 'Reference:',
        book: 'Reference:',
        bookmark_tabs: 'Reference:',
        graduation_cap: 'Education:',
        key: 'Key:',
        muscle: 'Strength:',
        puzzle_piece: 'Puzzle:'
      }

      const replaceEmojiMarkup = (value: string): string =>
        value.replace(/:([a-z0-9_+-]+):/gi, (match, code) => {
          const normalized = code.toLowerCase() as keyof typeof EMOJI_COLON_REPLACEMENTS
          return EMOJI_COLON_REPLACEMENTS[normalized] ?? match
        })

      const cleanedContent = tightenMarkdownEmphasis(replaceEmojiMarkup(sanitizeIntro(content.content)))
      const tokens = marked.lexer(cleanedContent) as Tokens.Generic[]

      const lexInlineTokens = (rawText: string): Tokens.Generic[] =>
        rawText ? ((marked.Lexer.lexInline(rawText) as Tokens.Generic[]) ?? []) : []

      const EMOJI_CHAR_REPLACEMENTS: Record<string, string> = {
        '✅': 'Yes',
        '☑️': 'Yes',
        '✔️': 'Yes',
        '☑': 'Yes',
        '✔': 'Yes',
        '❌': 'No',
        '✖️': 'No',
        '✘': 'No',
        '⚠️': 'Warning:',
        '⚠': 'Warning:',
        '⭐️': 'Highlight:',
        '🌟': 'Highlight:',
        '✨': 'Highlight:',
        '➡️': '->',
        '➔': '->',
        '➜': '->',
        '👉': '->',
        '🔗': 'Link:',
        '💡': 'Idea:',
        '🔥': 'Hot:',
        '🎯': 'Goal:',
        '📌': '•',
        '📍': '•',
        '🚀': 'Launch:',
        '🎓': 'Education:',
        '🧠': 'Insight:',
        '📘': 'Reference:',
        '📚': 'Reference:',
        '📝': 'Notes:',
        '🔑': 'Key:',
        '💪': 'Strength:',
        '🧩': 'Puzzle:'
      }

      const normalizeGlyphs = (value: string): string => {
        if (!value) return ''
        const withoutSelectors = value.replace(/[\uFE0E\uFE0F]/g, '')

        let normalized = ''
        let skipNextSpace = false
        for (const char of Array.from(withoutSelectors)) {
          const replacement = EMOJI_CHAR_REPLACEMENTS[char]
          if (replacement) {
            normalized += replacement
            skipNextSpace = false
            continue
          }

          const codePoint = char.codePointAt(0) ?? 0
          if (codePoint >= 0x1f000) {
            skipNextSpace = true
            continue
          }
          if (skipNextSpace && char === ' ') {
            skipNextSpace = false
            continue
          }
          skipNextSpace = false
          normalized += char
        }
        return normalized
      }

      const normalizeFragment = (fragment: TextFragment): TextFragment | null => {
        if (typeof fragment === 'string') {
          const text = normalizeGlyphs(fragment)
          return text ? text : null
        }
        const text = normalizeGlyphs(fragment.text)
        if (!text) return null
        return { ...fragment, text }
      }

      const finalizeFragments = (fragments: TextFragment[]): TextFragment[] =>
        fragments
          .map(normalizeFragment)
          .filter((fragment): fragment is TextFragment => fragment !== null)

      type TableRowTokens = Tokens.Table['rows'][number]
      type TableCellTokens = Tokens.TableCell

      const buildInline = (inlineTokens?: Tokens.Generic[], fallbackText = ''): TextFragment[] => {
        const tokensToProcess = inlineTokens && inlineTokens.length > 0 ? inlineTokens : lexInlineTokens(fallbackText)
        if (tokensToProcess.length === 0) return []
        const fragments: TextFragment[] = []

        tokensToProcess.forEach(inlineToken => {
          switch (inlineToken.type) {
            case 'text': {
              const textToken = inlineToken as Tokens.Text
              fragments.push(textToken.text ?? '')
              break
            }
            case 'strong': {
              const strongToken = inlineToken as Tokens.Strong
              finalizeFragments(
                buildInline(strongToken.tokens as Tokens.Generic[] | undefined, strongToken.text ?? '')
              ).forEach(fragment => {
                fragments.push(
                  typeof fragment === 'string'
                    ? { text: fragment, bold: true }
                    : { ...fragment, bold: true }
                )
              })
              break
            }
            case 'em': {
              const emphasisToken = inlineToken as Tokens.Em
              finalizeFragments(
                buildInline(emphasisToken.tokens as Tokens.Generic[] | undefined, emphasisToken.text ?? '')
              ).forEach(fragment => {
                fragments.push(
                  typeof fragment === 'string'
                    ? { text: fragment, italics: true }
                    : { ...fragment, italics: true }
                )
              })
              break
            }
            case 'codespan': {
              const codeToken = inlineToken as Tokens.Codespan
              if (codeToken.text) {
                fragments.push({
                  text: codeToken.text,
                  color: '#0f172a',
                  background: '#f1f5f9'
                })
              }
              break
            }
            case 'link': {
              const linkToken = inlineToken as Tokens.Link
              const nested = finalizeFragments(
                buildInline(linkToken.tokens as Tokens.Generic[] | undefined, linkToken.text ?? '')
              )
              nested.forEach(fragment => {
                const linkTarget = linkToken.href ?? ''
                fragments.push(
                  typeof fragment === 'string'
                    ? { text: fragment, link: linkTarget, color: '#0ea5e9' }
                    : { ...fragment, link: linkTarget, color: '#0ea5e9' }
                )
              })
              break
            }
            case 'br':
              fragments.push('\n')
              break
            case 'escape': {
              const escapeToken = inlineToken as Tokens.Escape
              fragments.push(escapeToken.text ?? '')
              break
            }
            default:
              if ('text' in inlineToken) {
                const genericText = inlineToken as Tokens.Text
                if (genericText.text) {
                  fragments.push(genericText.text)
                }
              }
          }
        })

        return finalizeFragments(fragments)
      }

      const resolveAlignment = (value?: string | null): 'left' | 'center' | 'right' => {
        if (value === 'center' || value === 'right') {
          return value
        }
        return 'left'
      }

      const buildContent = (tokenList: Tokens.Generic[]): PdfContent[] => {
        const sections: PdfContent[] = []

        tokenList.forEach(token => {
          switch (token.type) {
            case 'space':
              break
            case 'heading': {
              const headingToken = token as Tokens.Heading
              const inline = buildInline(
                headingToken.tokens as Tokens.Generic[] | undefined,
                headingToken.text ?? ''
              )
              sections.push({
                text: inline.length > 0 ? inline : normalizeGlyphs(headingToken.text ?? ''),
                style: `h${Math.min(headingToken.depth, 4)}`
              })
              break
            }
            case 'paragraph': {
              const paragraphToken = token as Tokens.Paragraph
              const inline = buildInline(
                paragraphToken.tokens as Tokens.Generic[] | undefined,
                paragraphToken.text ?? ''
              )
              sections.push({
                text: inline.length > 0 ? inline : normalizeGlyphs(paragraphToken.text ?? ''),
                style: 'paragraph',
                margin: [0, 0, 0, 10]
              })
              break
            }
            case 'list': {
              const listToken = token as Tokens.List
              const items = listToken.items.map((item: Tokens.ListItem) => {
                const itemBlocks = buildContent((item.tokens as Tokens.Generic[] | undefined) ?? [])
                if (itemBlocks.length === 0) {
                  const fallbackInline = buildInline(undefined, item.text ?? '')
                  if (fallbackInline.length === 0) {
                    const fallbackText = normalizeGlyphs(item.text ?? '')
                    return fallbackText ? { text: fallbackText, style: 'paragraph', margin: [0, 0, 0, 4] } : ''
                  }
                  return {
                    text: fallbackInline,
                    style: 'paragraph',
                    margin: [0, 0, 0, 4]
                  }
                }
                if (itemBlocks.length === 1) {
                  return itemBlocks[0]
                }
                return { stack: itemBlocks, margin: [0, 0, 0, 4] }
              })

              sections.push(
                listToken.ordered
                  ? { ol: items, style: 'list', margin: [0, 4, 0, 10] }
                  : { ul: items, style: 'list', margin: [0, 4, 0, 10] }
              )
              break
            }
            case 'blockquote': {
              const blockquoteToken = token as Tokens.Blockquote
              const blockquoteBody = buildContent((blockquoteToken.tokens as Tokens.Generic[] | undefined) ?? [])
              sections.push({
                table: {
                  widths: ['*'],
                  body: [
                    [
                      {
                        stack: blockquoteBody,
                        border: [false, false, false, false],
                        margin: [12, 8, 12, 8],
                        fillColor: '#f8fafc'
                      }
                    ]
                  ]
                },
                layout: {
                  paddingLeft: () => 0,
                  paddingRight: () => 0,
                  paddingTop: () => 0,
                  paddingBottom: () => 0,
                  hLineWidth: () => 0,
                  vLineWidth: (index: number) => (index === 0 ? 3 : 0),
                  vLineColor: () => '#38bdf8'
                },
                margin: [0, 12, 0, 12]
              })
              break
            }
            case 'table': {
              const tableToken = token as Tokens.Table
              const columnCount = Math.max(
                tableToken.header.length,
                ...tableToken.rows.map(row => row.length)
              )
              const isWideTable = columnCount >= 5

              const fragmentsToPlainText = (fragments: TextFragment[]): string =>
                fragments.map(fragment => (typeof fragment === 'string' ? fragment : fragment.text ?? '')).join('')

              const createCheckMarkGraphic = (compact: boolean): PdfContent => ({
                alignment: 'center',
                margin: compact ? [0, 1.5, 0, 1.5] : [0, 2.5, 0, 2.5],
                stack: [
                  {
                    canvas: [
                      {
                        type: 'polyline',
                        points: [
                          { x: 0, y: compact ? 5 : 6 },
                          { x: compact ? 3 : 4, y: compact ? 7 : 9 },
                          { x: compact ? 8 : 12, y: 0 }
                        ],
                        lineWidth: compact ? 1 : 1.4,
                        lineColor: '#0f172a'
                      }
                    ]
                  }
                ]
              })

              const createTableCellContent = (
                fragments: TextFragment[],
                rawText: string,
                alignment: 'left' | 'center' | 'right',
                compact: boolean,
                isHeader = false
              ): PdfContent => {
                const normalizedRaw = normalizeGlyphs(rawText)
                const fragmentsText = fragments.length > 0 ? normalizeGlyphs(fragmentsToPlainText(fragments)) : normalizedRaw
                const trimmed = fragmentsText.trim().toLowerCase()

                const positiveMarks = new Set(['[x]', 'x', '✓', 'yes', 'done'])
                if (positiveMarks.has(trimmed)) {
                  return createCheckMarkGraphic(compact)
                }

                if (trimmed === '[ ]' || trimmed === '') {
                  return {
                    text: '',
                    alignment,
                    margin: compact ? [6, 2, 6, 2] : [8, 3, 8, 3]
                  }
                }

                const styleName = isHeader
                  ? (compact ? 'tableHeaderCompact' : 'tableHeader')
                  : (compact ? 'tableCellCompact' : 'tableCell')

                const margin = compact
                  ? (isHeader ? [6, 4, 6, 4] : [6, 2, 6, 2])
                  : (isHeader ? [8, 6, 8, 6] : [8, 4, 8, 4])

                const fragmentContent = fragments.length > 0 ? fragments : fragmentsText

                if (typeof fragmentContent === 'string' && fragmentContent.startsWith('•') && fragmentContent.length > 1) {
                  return {
                    columns: [
                      { text: '•', width: compact ? 10 : 12, alignment: 'center' },
                      {
                        text: fragmentContent.slice(1).trimStart(),
                        alignment,
                        style: styleName,
                        margin
                      }
                    ],
                    columnGap: compact ? 2 : 4
                  }
                }

                return {
                  text: fragmentContent,
                  style: styleName,
                  alignment,
                  margin
                }
              }

              const widths: Array<number | '*'> = (() => {
                if (columnCount <= 0) return ['*']
                if (!isWideTable) {
                  return Array.from({ length: columnCount }, () => '*') as Array<number | '*'>
                }

                const printableWidth = 480
                const firstColumnWidth = Math.max(84, Math.floor(printableWidth * 0.2))
                const lastColumnWidth = Math.max(140, Math.floor(printableWidth * 0.3))
                const middleColumnCount = Math.max(columnCount - 2, 1)
                const remainingWidth = Math.max(printableWidth - firstColumnWidth - lastColumnWidth, middleColumnCount * 32)
                const middleColumnWidth = Math.max(Math.floor(remainingWidth / middleColumnCount), 40)

                const computed: number[] = [firstColumnWidth]
                for (let i = 0; i < middleColumnCount; i += 1) {
                  computed.push(middleColumnWidth)
                }
                computed.push(lastColumnWidth)

                const assignedWidth = computed.reduce((sum, value) => sum + value, 0)
                const diff = printableWidth - assignedWidth
                if (diff !== 0) {
                  const perColumn = Math.trunc(diff / computed.length)
                  let remainder = diff - perColumn * computed.length
                  computed.forEach((value, index) => {
                    let adjusted = value + perColumn
                    if (remainder !== 0) {
                      adjusted += remainder > 0 ? 1 : -1
                      remainder += remainder > 0 ? -1 : 1
                    }
                    computed[index] = Math.max(40, adjusted)
                  })
                }

                return computed
              })()

              const tableLayout: Record<string, unknown> = {
                fillColor: (rowIndex: number) => {
                  if (rowIndex === 0) return '#f8fafc'
                  if (!isWideTable) return undefined
                  return rowIndex % 2 === 0 ? '#f9fafb' : undefined
                },
                hLineWidth: (index: number, node: { table: { body: unknown[][] } }) =>
                  index === 0 || index === node.table.body.length ? 1 : 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#d1d5db',
                vLineColor: () => '#e5e7eb',
                paddingTop: () => (isWideTable ? 2 : 6),
                paddingBottom: () => (isWideTable ? 2 : 6),
                paddingLeft: () => (isWideTable ? 3 : 8),
                paddingRight: () => (isWideTable ? 3 : 8)
              }

              const headerRow = tableToken.header.map((cell: TableCellTokens, columnIndex: number) => {
                const fragments = buildInline(cell.tokens as Tokens.Generic[] | undefined, cell.text ?? '')
                return createTableCellContent(
                  fragments,
                  cell.text ?? '',
                  resolveAlignment(tableToken.align?.[columnIndex] ?? 'center'),
                  isWideTable,
                  true
                )
              })

              const bodyRows = tableToken.rows.map((row: TableRowTokens) =>
                row.map((cell: TableCellTokens, columnIndex: number) => {
                  const fragments = buildInline(cell.tokens as Tokens.Generic[] | undefined, cell.text ?? '')
                  return createTableCellContent(
                    fragments,
                    cell.text ?? '',
                    resolveAlignment(tableToken.align?.[columnIndex] ?? 'center'),
                    isWideTable,
                    false
                  )
                })
              )

              sections.push({
                table: {
                  widths,
                  body: [headerRow, ...bodyRows],
                  headerRows: 1
                },
                layout: tableLayout,
                margin: [0, 12, 0, isWideTable ? 16 : 18],
                dontBreakRows: false,
                keepWithHeaderRows: 1
              })
              break
            }
            case 'code':
              sections.push({
                text: normalizeGlyphs((token as Tokens.Code).text ?? ''),
                style: 'codeBlock',
                margin: [0, 8, 0, 12]
              })
              break
            case 'text': {
              const textToken = token as Tokens.Text
              const inline = buildInline(textToken.tokens as Tokens.Generic[] | undefined, textToken.text ?? '')
              const textContent = inline.length > 0 ? inline : normalizeGlyphs(textToken.text ?? '')
              if (typeof textContent === 'string' && !textContent.trim()) {
                break
              }
              sections.push({
                text: textContent,
                style: 'paragraph',
                margin: [0, 0, 0, 8]
              })
              break
            }
            case 'hr':
              sections.push({
                canvas: [
                  {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: 515,
                    y2: 0,
                    lineWidth: 1,
                    lineColor: '#e2e8f0'
                  }
                ],
                margin: [0, 14, 0, 14]
              })
              break
            default:
              break
          }
        })

        return sections
      }

      const bodyContent = buildContent(tokens)
      const headerContent: PdfContent = {
        stack: [
          { text: tool.name.toUpperCase(), style: 'toolLabel' },
          { text: content.title, style: 'title' },
          {
            columns: [
              {
                text: createdAt.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                style: 'meta'
              },
              {
                text: `Generated at ${createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                style: 'meta',
                alignment: 'right'
              }
            ],
            margin: [0, 6, 0, 12]
          }
        ],
        margin: [0, 0, 0, 12]
      }

      const descriptorContent: PdfContent = {
        text: `Crafted by CogniLeapAI • ${tool.description}`,
        style: 'descriptor',
        margin: [0, 0, 0, 18]
      }

      const documentDefinition: PdfDocumentDefinition = {
        info: {
          title: content.title
        },
        content: [headerContent, descriptorContent, ...bodyContent],
        styles: {
          title: { fontSize: 20, bold: true, color: '#0f172a', margin: [0, 4, 0, 0] },
          toolLabel: { fontSize: 9, bold: true, color: '#0f172a', letterSpacing: 1.2 },
          meta: { fontSize: 9, color: '#64748b' },
          descriptor: { fontSize: 10, color: '#475569' },
          paragraph: { fontSize: 11, lineHeight: 1.55, color: '#0f172a' },
          list: { fontSize: 11, lineHeight: 1.5, color: '#0f172a' },
          h1: { fontSize: 18, bold: true, color: '#0f172a', margin: [0, 18, 0, 8] },
          h2: { fontSize: 16, bold: true, color: '#0f172a', margin: [0, 16, 0, 6] },
          h3: { fontSize: 14, bold: true, color: '#0f172a', margin: [0, 14, 0, 5] },
          h4: { fontSize: 12, bold: true, color: '#0f172a', margin: [0, 12, 0, 4] },
          codeBlock: {
            fontSize: 10,
            color: '#0f172a',
            fillColor: '#f1f5f9',
            margin: [0, 8, 0, 12],
            alignment: 'left'
          },
          blockquoteText: { fontSize: 11, italics: true, color: '#0f172a', lineHeight: 1.5 },
          tableHeader: { fontSize: 11, bold: true, color: '#0f172a' },
          tableHeaderCompact: { fontSize: 9, bold: true, color: '#0f172a' },
          tableCell: { fontSize: 11, color: '#0f172a', lineHeight: 1.45 },
          tableCellCompact: { fontSize: 9, color: '#0f172a', lineHeight: 1.35 }
        },
        defaultStyle: {
          fontSize: 11,
          color: '#0f172a',
          lineHeight: 1.55
        },
        pageMargins: [48, 56, 48, 56]
      }

      const safeFileName = `${content.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.pdf`
      pdfMake.createPdf(documentDefinition).download(safeFileName)

    } catch (error) {
      console.error('Failed to download PDF:', error)
      throw error
    }
  },

  downloadAsDOCX: async (content: StudyToolContent): Promise<void> => {
    const cleanupPatterns = [
      /^Of course[.,]?\s*/i,
      /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
      /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
      /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
      /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
      /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
      /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
      /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
    ]

    try {
      const [docxModule, markedModule, fileSaverModule] = await Promise.all([
        import('docx'),
        import('marked'),
        import('file-saver')
      ])

      const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        AlignmentType,
        HeadingLevel,
        ShadingType,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
        LevelFormat
      } = docxModule
      const { marked } = markedModule
      const saveAs = fileSaverModule.default || fileSaverModule.saveAs

      const FONT_SIZES = {
        title: 36,
        heading1: 36,
        heading2: 30,
        heading3: 26,
        heading4: 24,
        heading5: 24,
        paragraph: 24,
        listOrderedLevel0: 26,
        listOrderedLevel1: 24,
        listOrderedLevelN: 24,
        listBulletLevel0: 24,
        listBulletLevel1: 24,
        listBulletLevelN: 24,
        tableHeader: 24,
        tableCell: 24,
        blockquote: 24,
        code: 24
      } as const

      const toolThemes: Record<StudyToolType, { accent: string; bannerFill: string; description: string; emoji: string }> = {
        'smart-notes': { accent: '7C3AED', bannerFill: 'F3E8FF', description: 'Organized notes with highlights and key insights', emoji: '📝' },
        'smart-summary': { accent: 'F59E0B', bannerFill: 'FEF3C7', description: 'Concise overview with essential takeaways', emoji: '⚡' },
        'study-guide': { accent: '0F766E', bannerFill: 'D1FAE5', description: 'Comprehensive study guide with structured learning path', emoji: '📖' },
        'flashcards': { accent: '0EA5E9', bannerFill: 'CFFAFE', description: 'Interactive flashcards — explore key questions and answers', emoji: '📚' }
      }

      const theme = toolThemes[content.type] ?? toolThemes['study-guide']

      let cleanedContent = content.content
      for (const pattern of cleanupPatterns) {
        cleanedContent = cleanedContent.replace(pattern, '')
      }
      cleanedContent = cleanedContent.replace(/^[\s*]+/, '').trim()

      type GenericToken = ReturnType<typeof marked.lexer>[number]
      type ListToken = GenericToken & { type: 'list'; ordered: boolean; items: Array<GenericToken & { tokens?: GenericToken[]; text?: string }> }
      type TableToken = GenericToken & { type: 'table'; header: { text: string }[]; rows: { text: string }[][] }

      const tokens = marked.lexer(cleanedContent, { gfm: true }) as GenericToken[]

      type TokenWithOptionalText = { text?: string }
      type TokenWithOptionalTokens = { tokens?: GenericToken[] }

      const hasText = (token: GenericToken | undefined): token is GenericToken & { text: string } =>
        !!token && typeof (token as TokenWithOptionalText).text === 'string'

      const textOrEmpty = (token: GenericToken | undefined): string => (hasText(token) ? token.text : '')

      const getTokens = (token: GenericToken | undefined): GenericToken[] => {
        if (!token) return []
        const possible = (token as TokenWithOptionalTokens).tokens
        return Array.isArray(possible) ? possible : []
      }

      interface NumberingLevelConfiguration {
        level: number
        format: (typeof LevelFormat)[keyof typeof LevelFormat]
        text: string
        alignment: (typeof AlignmentType)[keyof typeof AlignmentType]
        style: {
          paragraph: { indent: { left: number; hanging: number } }
          run: { size: number }
        }
      }

      const docChildren: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = []
      const numberingConfigs: Array<{ reference: string; levels: NumberingLevelConfiguration[] }> = []
      let listCounter = 0

      const lexInline = (text: string): GenericToken[] => {
        const lexer = marked.Lexer as unknown as { lexInline: (src: string) => GenericToken[] }
        return lexer.lexInline(text)
      }

      const createRuns = (
        inlineTokens: GenericToken[] | undefined,
        fontSize: number,
        opts: { bold?: boolean; italics?: boolean } = {}
      ): InstanceType<typeof TextRun>[] => {
        const runs: InstanceType<typeof TextRun>[] = []
        if (!inlineTokens) return runs

        const applyText = (text: string, bold: boolean, italics: boolean) => {
          const segments = text.split('\n')
          segments.forEach((segment, idx) => {
            if (segment.length > 0) {
              runs.push(new TextRun({ text: segment, bold, italics, size: fontSize, color: '000000' }))
            }
            if (idx < segments.length - 1) {
              runs.push(new TextRun({ break: 1 }))
            }
          })
        }

        const walk = (tokensToWalk: GenericToken[], context: { bold: boolean; italics: boolean }) => {
          for (const token of tokensToWalk) {
            switch (token.type) {
              case 'text': {
                const textContent = textOrEmpty(token)
                const inlineTokens = lexInline(textContent)
                if (
                  inlineTokens.length === 1 &&
                  inlineTokens[0].type === 'text' &&
                  textOrEmpty(inlineTokens[0]) === textContent
                ) {
                  applyText(textContent, context.bold, context.italics)
                } else {
                  walk(inlineTokens, context)
                }
                break
              }
              case 'strong': {
                const childTokens = getTokens(token)
                const nextTokens = childTokens.length > 0 ? childTokens : lexInline(textOrEmpty(token))
                walk(nextTokens, { bold: true, italics: context.italics })
                break
              }
              case 'em': {
                const childTokens = getTokens(token)
                const nextTokens = childTokens.length > 0 ? childTokens : lexInline(textOrEmpty(token))
                walk(nextTokens, { bold: context.bold, italics: true })
                break
              }
              case 'codespan': {
                const codeText = textOrEmpty(token)
                if (codeText) {
                  applyText(codeText, context.bold, context.italics)
                }
                break
              }
              case 'link': {
                const linkText = textOrEmpty(token)
                if (linkText) {
                  applyText(linkText, context.bold, context.italics)
                }
                break
              }
              case 'br':
                runs.push(new TextRun({ break: 1 }))
                break
              default: {
                const fallback = textOrEmpty(token)
                if (fallback) {
                  applyText(fallback, context.bold, context.italics)
                }
                break
              }
            }
          }
        }

        walk(inlineTokens, { bold: !!opts.bold, italics: !!opts.italics })
        return runs
      }

      const listFontSizeFor = (level: number, ordered: boolean): number => {
        if (ordered) {
          if (level <= 0) return FONT_SIZES.listOrderedLevel0
          if (level === 1) return FONT_SIZES.listOrderedLevel1
          return FONT_SIZES.listOrderedLevelN
        }

        if (level <= 0) return FONT_SIZES.listBulletLevel0
        if (level === 1) return FONT_SIZES.listBulletLevel1
        return FONT_SIZES.listBulletLevelN
      }

      const registerListReference = (ordered: boolean) => {
        const reference = `${ordered ? 'ordered' : 'bullet'}-list-${++listCounter}`
        const glyphs = ['•', '◦', '▪', '·']
        numberingConfigs.push({
          reference,
          levels: Array.from({ length: 6 }).map((_, level) => ({
            level,
            format: ordered ? LevelFormat.DECIMAL : LevelFormat.BULLET,
            text: ordered ? `%${level + 1}.` : glyphs[Math.min(level, glyphs.length - 1)],
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720 * (level + 1), hanging: 360 }
              },
              run: {
                size: listFontSizeFor(level, ordered)
              }
            }
          }))
        })
        return reference
      }

      const convertList = (
        listToken: ListToken,
        level = 0,
        reference?: string,
        referenceOrdered?: boolean
      ): InstanceType<typeof Paragraph>[] => {
        const listReference =
          reference && referenceOrdered === listToken.ordered
            ? reference
            : registerListReference(listToken.ordered)
        const result: InstanceType<typeof Paragraph>[] = []

        listToken.items.forEach((item) => {
          const inlineTokens: GenericToken[] = []
          const nestedLists: ListToken[] = []

          for (const child of item.tokens ?? []) {
            if (child.type === 'list') {
              nestedLists.push(child as ListToken)
            } else if (child.type !== 'space') {
              inlineTokens.push(child)
            }
          }

          const itemText = 'text' in item && typeof item.text === 'string' ? item.text : ''

          if (inlineTokens.length === 0 && itemText) {
            inlineTokens.push(...lexInline(itemText))
          }

          const fontSize = listFontSizeFor(level, listToken.ordered)
          const runs = createRuns(inlineTokens, fontSize)
          if (runs.length === 0) {
            runs.push(new TextRun({ text: itemText, size: fontSize }))
          }

          result.push(new Paragraph({
            children: runs,
            numbering: {
              reference: listReference,
              level: Math.min(level, 5)
            },
            spacing: { before: 80, after: 80 }
          }))

          nestedLists.forEach((nested) => {
            result.push(
              ...convertList(
                nested,
                Math.min(level + 1, 5),
                nested.ordered === listToken.ordered ? listReference : undefined,
                nested.ordered === listToken.ordered ? listToken.ordered : undefined
              )
            )
          })
        })

        return result
      }

      const createHeadingParagraph = (token: GenericToken & { depth: number }) => {
        const level = Math.min(token.depth ?? 1, 5)
        const inlineTokens = getTokens(token)
        const sizeMap: Record<number, number> = {
          1: FONT_SIZES.heading1,
          2: FONT_SIZES.heading2,
          3: FONT_SIZES.heading3,
          4: FONT_SIZES.heading4,
          5: FONT_SIZES.heading5
        }
        const runs = createRuns(inlineTokens, sizeMap[level], { bold: true })
        const headingText = textOrEmpty(token)
        if (runs.length === 0 && headingText) {
          runs.push(new TextRun({ text: headingText, bold: true, size: sizeMap[level] }))
        }
        const headingLevel = level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4
        return new Paragraph({
          children: runs,
          heading: headingLevel,
          spacing: { before: 200, after: 140 }
        })
      }

      const createParagraph = (token: GenericToken) => {
        const runs = createRuns(getTokens(token), FONT_SIZES.paragraph)
        return new Paragraph({
          children: runs,
          spacing: { before: 120, after: 120 },
          alignment: AlignmentType.JUSTIFIED
        })
      }

      const createTable = (token: TableToken) => {
        const headerRow = new TableRow({
          tableHeader: true,
          children: token.header.map((cell) => new TableCell({
            children: [
              new Paragraph({
                children: createRuns(lexInline(cell.text), FONT_SIZES.tableHeader, { bold: true }),
                alignment: AlignmentType.CENTER
              })
            ],
            shading: { type: ShadingType.CLEAR, fill: theme.bannerFill, color: theme.bannerFill },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 4, color: theme.accent },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: theme.accent },
              left: { style: BorderStyle.SINGLE, size: 4, color: theme.accent },
              right: { style: BorderStyle.SINGLE, size: 4, color: theme.accent }
            }
          }))
        })

        const dataRows = token.rows.map((row) => new TableRow({
          children: row.map((cell) => new TableCell({
            children: [
              new Paragraph({
                children: createRuns(lexInline(cell.text), FONT_SIZES.tableCell),
                spacing: { before: 80, after: 80 }
              })
            ]
          }))
        }))

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
          margins: { top: 80, bottom: 80, left: 80, right: 80 }
        })
      }

      const createBlockquote = (token: GenericToken & { text?: string }) => {
        const runs = createRuns(lexInline(textOrEmpty(token)), FONT_SIZES.blockquote, { italics: true })
        return new Paragraph({
          children: runs,
          spacing: { before: 160, after: 160 },
          border: { left: { style: BorderStyle.SINGLE, size: 6, color: theme.accent } },
          indent: { left: 480 }
        })
      }

      const createCodeBlock = (token: GenericToken & { text?: string }) => {
        return new Paragraph({
          children: [
            new TextRun({ text: textOrEmpty(token), font: 'Courier New', size: FONT_SIZES.code, color: '1F2937' })
          ],
          shading: { type: ShadingType.CLEAR, fill: 'F3F4F6', color: 'F3F4F6' },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'E5E7EB' }
          },
          spacing: { before: 160, after: 160 }
        })
      }

      const generatedOn = `Generated on ${new Date(content.createdAt).toLocaleDateString()} at ${new Date(content.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: content.title, bold: true, size: FONT_SIZES.title, color: theme.accent })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: generatedOn, italics: true, size: FONT_SIZES.paragraph, color: '6B7280' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `${theme.emoji} ${theme.description}`, bold: true, size: FONT_SIZES.paragraph, color: theme.accent })],
          shading: { type: ShadingType.CLEAR, fill: theme.bannerFill, color: theme.bannerFill },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: theme.accent } },
          indent: { left: 240 },
          spacing: { before: 120, after: 200 }
        })
      )

      for (const token of tokens) {
        switch (token.type) {
          case 'space':
            docChildren.push(new Paragraph({ children: [new TextRun({ break: 1 })] }))
            break
          case 'heading':
            docChildren.push(createHeadingParagraph(token as GenericToken & { depth: number }))
            break
          case 'paragraph':
            docChildren.push(createParagraph(token))
            break
          case 'blockquote':
            docChildren.push(createBlockquote(token as GenericToken & { text?: string }))
            break
          case 'code':
            docChildren.push(createCodeBlock(token as GenericToken & { text?: string }))
            break
          case 'list':
            docChildren.push(...convertList(token as ListToken))
            break
          case 'table':
            docChildren.push(createTable(token as TableToken))
            break
          default:
            if (hasText(token)) {
              docChildren.push(createParagraph(token))
            }
            break
        }
      }

      const doc = new Document({
        numbering: { config: numberingConfigs },
        sections: [
          {
            properties: {
              page: {
                margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }
              }
            },
            children: docChildren
          }
        ]
      })

      const blob = await Packer.toBlob(doc)
      const safeFileName = `${content.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.docx`
      saveAs(blob, safeFileName)

    } catch (error) {
      console.error('Failed to download DOCX:', error)

      try {
        console.log('Falling back to text file download...')

        let cleanedContent = content.content
        for (const pattern of cleanupPatterns) {
          cleanedContent = cleanedContent.replace(pattern, '')
        }
        cleanedContent = cleanedContent.replace(/^[\s*]+/, '').trim()

        const textContent = `${content.title}\n\nGenerated on ${new Date(content.createdAt).toLocaleDateString()} at ${new Date(content.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n${'='.repeat(50)}\n\n${cleanedContent}`

        const blob = new Blob([textContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${content.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (fallbackError) {
        console.error('Fallback text download also failed:', fallbackError)
        throw new Error('Failed to download document in any format')
      }
    }
  }
}),
    {
      name: 'study-tools-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        generatedContent: state.generatedContent.map(content => ({
          ...content,
          createdAt: typeof content.createdAt === 'string' ? content.createdAt : content.createdAt.toISOString() // Handle both Date and string
        })),
      }),
      onRehydrateStorage: () => (state) => {
        // Deserialize Date strings back to Date objects
        if (state?.generatedContent) {
          state.generatedContent = state.generatedContent.map(content => ({
            ...content,
            createdAt: typeof content.createdAt === 'string' ? new Date(content.createdAt) : content.createdAt
          }))
        }
      }
    }
  )
)
