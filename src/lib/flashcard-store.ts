'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { FlashcardSet, FlashcardEntry, FlashcardProgress, FlashcardStudySession } from '@/types/flashcards'

interface FlashcardStore {
  // Viewer state
  isViewerOpen: boolean
  currentFlashcardSet: FlashcardSet | null
  isFullscreen: boolean

  // Session state
  currentSession: FlashcardStudySession | null

  // Generated flashcard sets
  flashcardSets: FlashcardSet[]

  // Actions
  openViewer: (flashcardSet: FlashcardSet) => void
  closeViewer: () => void
  toggleFullscreen: () => void

  // Session management
  startSession: (flashcardSetId: string) => void
  endSession: () => void
  updateProgress: (progress: Partial<FlashcardProgress>) => void
  recordAnswer: (cardId: string, isCorrect: boolean, timeSpent: number) => void

  // Flashcard set management
  addFlashcardSet: (flashcardSet: FlashcardSet) => void
  removeFlashcardSet: (id: string) => Promise<void>
  renameFlashcardSet: (id: string, newTitle: string) => Promise<void>
  clearFlashcardSets: () => void
  deduplicateFlashcardSets: () => void

  // Utilities
  getFlashcardSetById: (id: string) => FlashcardSet | null
  getSessionStats: () => {
    totalCards: number
    correctAnswers: number
    accuracy: number
    timeSpent: number
  } | null
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isViewerOpen: false,
      currentFlashcardSet: null,
      isFullscreen: false,
      currentSession: null,
      flashcardSets: [],

      // Viewer actions
      openViewer: (flashcardSet: FlashcardSet) => {
        console.log('[FlashcardStore] Opening viewer with flashcard set:', flashcardSet.id)

        // Close canvas when opening flashcards (mutual exclusion)
        try {
          const { useStudyToolsStore } = require('@/lib/study-tools-store')
          const studyToolsStore = useStudyToolsStore.getState()
          if (studyToolsStore.isCanvasOpen) {
            studyToolsStore.closeCanvas()
          }
        } catch (error) {
          console.warn('[FlashcardStore] Could not close canvas:', error)
        }

        set({
          isViewerOpen: true,
          currentFlashcardSet: flashcardSet,
          isFullscreen: false // Always start in study tools section, not fullscreen
        })

        // Start a new study session
        get().startSession(flashcardSet.id)
      },

      closeViewer: () => {
        console.log('[FlashcardStore] Closing viewer')
        const { currentSession } = get()

        // End current session if active
        if (currentSession && !currentSession.completedAt) {
          get().endSession()
        }

        set({
          isViewerOpen: false,
          isFullscreen: false
        })

        // Clear current flashcard set after animation delay
        setTimeout(() => {
          set({ currentFlashcardSet: null })
        }, 300)
      },

      toggleFullscreen: () => {
        set(state => ({
          isFullscreen: !state.isFullscreen
        }))
      },

      // Session management
      startSession: (flashcardSetId: string) => {
        const flashcardSet = get().getFlashcardSetById(flashcardSetId)
        if (!flashcardSet) {
          console.error('[FlashcardStore] Cannot start session: flashcard set not found:', flashcardSetId)
          return
        }

        const session: FlashcardStudySession = {
          flashcardSetId,
          progress: {
            currentIndex: 0,
            totalCards: flashcardSet.cards.length,
            completedCards: 0,
            correctAnswers: 0,
            isFullscreen: false,
            showAnswer: false,
            sessionStartTime: new Date()
          },
          answers: [],
          startedAt: new Date()
        }

        console.log('[FlashcardStore] Starting new session:', session)
        set({ currentSession: session })
      },

      endSession: () => {
        const { currentSession } = get()
        if (!currentSession) return

        const completedSession: FlashcardStudySession = {
          ...currentSession,
          completedAt: new Date()
        }

        console.log('[FlashcardStore] Ending session:', completedSession)
        set({ currentSession: completedSession })
      },

      updateProgress: (progressUpdate: Partial<FlashcardProgress>) => {
        set(state => {
          if (!state.currentSession) return state

          return {
            currentSession: {
              ...state.currentSession,
              progress: {
                ...state.currentSession.progress,
                ...progressUpdate
              }
            }
          }
        })
      },

      recordAnswer: (cardId: string, isCorrect: boolean, timeSpent: number) => {
        set(state => {
          if (!state.currentSession) return state

          const existingAnswerIndex = state.currentSession.answers.findIndex(
            answer => answer.cardId === cardId
          )

          const updatedAnswers = [...state.currentSession.answers]

          if (existingAnswerIndex >= 0) {
            // Update existing answer
            updatedAnswers[existingAnswerIndex] = {
              ...updatedAnswers[existingAnswerIndex],
              isCorrect,
              timeSpent: updatedAnswers[existingAnswerIndex].timeSpent + timeSpent,
              attempts: updatedAnswers[existingAnswerIndex].attempts + 1
            }
          } else {
            // Add new answer
            updatedAnswers.push({
              cardId,
              isCorrect,
              timeSpent,
              attempts: 1
            })
          }

          // Update progress
          const correctAnswers = updatedAnswers.filter(answer => answer.isCorrect).length
          const completedCards = updatedAnswers.length

          return {
            currentSession: {
              ...state.currentSession,
              answers: updatedAnswers,
              progress: {
                ...state.currentSession.progress,
                correctAnswers,
                completedCards
              }
            }
          }
        })
      },

      // Flashcard set management
      addFlashcardSet: (flashcardSet: FlashcardSet) => {
        console.log('[FlashcardStore] Adding flashcard set:', flashcardSet.id)
        set(state => {
          // Check if flashcard set already exists to prevent duplicates
          const existingIndex = state.flashcardSets.findIndex(set => set.id === flashcardSet.id)
          if (existingIndex !== -1) {
            console.log('[FlashcardStore] Flashcard set already exists, updating:', flashcardSet.id)
            // Update existing flashcard set instead of adding duplicate
            const updatedSets = [...state.flashcardSets]
            updatedSets[existingIndex] = flashcardSet
            return { flashcardSets: updatedSets }
          } else {
            // Add new flashcard set
            return { flashcardSets: [flashcardSet, ...state.flashcardSets] }
          }
        })
      },

      removeFlashcardSet: async (id: string) => {
        console.log('[FlashcardStore] Removing flashcard set:', id)

        // Find the flashcard set to remove for potential rollback
        const currentState = get()
        const setToRemove = currentState.flashcardSets.find(set => set.id === id)

        if (!setToRemove) {
          console.warn('[FlashcardStore] Flashcard set not found in local state:', id)
          return
        }

        // Remove from local state immediately for responsive UI
        set(state => ({
          flashcardSets: state.flashcardSets.filter(set => set.id !== id)
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

          console.log('[FlashcardStore] Delete API response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[FlashcardStore] Delete API error response:', errorText)
            throw new Error(`Failed to delete from database: ${response.status} - ${errorText}`)
          }

          const result = await response.json()
          console.log('[FlashcardStore] Successfully deleted from database:', result)
        } catch (error) {
          console.error('[FlashcardStore] Failed to sync deletion to database:', error)

          // Rollback: add the flashcard set back to local state since database deletion failed
          set(state => ({
            flashcardSets: [setToRemove, ...state.flashcardSets].sort((a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          }))

          // Re-throw error to allow UI to show error message if needed
          throw error
        }
      },

      renameFlashcardSet: async (id: string, newTitle: string) => {
        console.log('[FlashcardStore] Renaming flashcard set:', id, 'to:', newTitle)

        // Update locally first for immediate UI feedback
        set(state => ({
          flashcardSets: state.flashcardSets.map(set =>
            set.id === id ? { ...set, title: newTitle } : set
          )
        }))

        // Sync with database
        try {
          // First, let's see what flashcard set we're trying to rename
          const currentSet = get().flashcardSets.find(set => set.id === id)
          console.log('[FlashcardStore] Attempting to sync rename to database:', {
            id,
            title: newTitle,
            currentSet: currentSet ? {
              id: currentSet.id,
              title: currentSet.title,
              createdAt: currentSet.createdAt,
              documentId: currentSet.documentId,
              conversationId: currentSet.conversationId
            } : null
          })

          const response = await fetch('/api/study-tools/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id,
              title: newTitle
            })
          })

          console.log('[FlashcardStore] API response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            console.error('[FlashcardStore] API error response:', errorText)
            throw new Error(`Failed to update in database: ${response.status} - ${errorText}`)
          }

          const result = await response.json()
          console.log('[FlashcardStore] Successfully synced rename to database:', result)
        } catch (error) {
          console.error('[FlashcardStore] Failed to sync rename to database:', error)
          // Note: We don't revert the local change since the user expects immediate feedback
          // The change will persist in localStorage and the user can try again
        }
      },

      clearFlashcardSets: () => {
        console.log('[FlashcardStore] Clearing all flashcard sets')
        set({ flashcardSets: [] })
      },

      deduplicateFlashcardSets: () => {
        console.log('[FlashcardStore] Deduplicating flashcard sets')
        set(state => {
          const uniqueSets = new Map<string, FlashcardSet>()

          // Keep only the latest version of each unique ID
          state.flashcardSets.forEach(set => {
            if (!uniqueSets.has(set.id) || new Date(set.createdAt) > new Date(uniqueSets.get(set.id)!.createdAt)) {
              uniqueSets.set(set.id, set)
            }
          })

          const deduplicatedSets = Array.from(uniqueSets.values())
          console.log(`[FlashcardStore] Removed ${state.flashcardSets.length - deduplicatedSets.length} duplicate sets`)

          return { flashcardSets: deduplicatedSets }
        })
      },

      // Utilities
      getFlashcardSetById: (id: string): FlashcardSet | null => {
        const { flashcardSets } = get()
        return flashcardSets.find(set => set.id === id) || null
      },

      getSessionStats: () => {
        const { currentSession } = get()
        if (!currentSession) return null

        const totalCards = currentSession.progress.totalCards
        const correctAnswers = currentSession.progress.correctAnswers
        const accuracy = totalCards > 0 ? (correctAnswers / totalCards) * 100 : 0
        const timeSpent = currentSession.answers.reduce((total, answer) => total + answer.timeSpent, 0)

        return {
          totalCards,
          correctAnswers,
          accuracy,
          timeSpent
        }
      }
    }),
    {
      name: 'flashcard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        flashcardSets: state.flashcardSets.map(set => ({
          ...set,
          createdAt: typeof set.createdAt === 'string' ? set.createdAt : set.createdAt.toISOString()
        })),
        // Don't persist viewer state or active sessions
      }),
      onRehydrateStorage: () => (state) => {
        // Deserialize Date strings back to Date objects
        if (state?.flashcardSets) {
          state.flashcardSets = state.flashcardSets.map(set => ({
            ...set,
            createdAt: typeof set.createdAt === 'string' ? new Date(set.createdAt) : set.createdAt
          }))

          // Clean up duplicates after rehydration
          console.log('[FlashcardStore] Rehydrated with', state.flashcardSets.length, 'flashcard sets, deduplicating...')
          setTimeout(() => {
            const store = useFlashcardStore.getState()
            store.deduplicateFlashcardSets()
          }, 0)
        }
      }
    }
  )
)