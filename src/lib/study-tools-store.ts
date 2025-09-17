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
    description: 'Interactive Q&A cards for memorization',
    icon: '📄',
    color: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-300'
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
  generateStudyTool: (type: StudyToolType, documentId?: string, conversationId?: string, flashcardOptions?: any) => Promise<void>

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

    // Close flashcard viewer when opening canvas (mutual exclusion)
    try {
      const { useFlashcardStore } = require('@/lib/flashcard-store')
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
    conversationId?: string,
    flashcardOptions?: any
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

      // Add placeholder to list immediately (except for flashcards which go to flashcard store)
      set(state => ({
        isGenerating: true,
        generatingType: type,
        generationProgress: 0,
        error: null,
        generatedContent: type !== 'flashcards' ? [placeholderContent, ...state.generatedContent] : state.generatedContent
      }))

      // For flashcards, add placeholder to flashcard store instead
      if (type === 'flashcards') {
        const { useFlashcardStore } = require('@/lib/flashcard-store')
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
        useFlashcardStore.getState().addFlashcardSet(placeholderFlashcardSet)
      }

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

        // Also update flashcard placeholder if it's a flashcard generation
        if (type === 'flashcards') {
          const { useFlashcardStore } = require('@/lib/flashcard-store')
          const flashcardStore = useFlashcardStore.getState()
          const updatedSets = flashcardStore.flashcardSets.map(set =>
            set.id === placeholderContent.id
              ? {
                  ...set,
                  metadata: {
                    ...set.metadata,
                    generationProgress: Math.min((set.metadata.generationProgress || 0) + Math.random() * 15, 90)
                  }
                }
              : set
          )
          useFlashcardStore.setState({ flashcardSets: updatedSets })
        }
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
          ...(type === 'flashcards' && flashcardOptions ? { flashcardOptions } : {})
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        throw new Error(`Failed to generate ${STUDY_TOOLS[type].name}`)
      }

      const result = await response.json()
      console.log('[StudyToolsStore] Generation successful:', result)

      // Handle flashcards specially
      if (type === 'flashcards' && result.cards) {
        // Import flashcard store dynamically to avoid circular deps
        const { useFlashcardStore } = await import('@/lib/flashcard-store')

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
        const flashcardStore = useFlashcardStore.getState()
        const updatedSets = flashcardStore.flashcardSets.map(set =>
          set.id === placeholderContent.id ? flashcardSet : set
        )
        useFlashcardStore.setState({ flashcardSets: updatedSets })

        // Mark generation as completed
        set(state => ({
          generationProgress: 100
        }))

        // Brief delay then open flashcard viewer (not canvas)
        setTimeout(() => {
          console.log('[StudyToolsStore] Opening flashcard viewer')

          // Open in proper flashcard viewer instead of canvas
          useFlashcardStore.getState().openViewer(flashcardSet)
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
      }

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
                let cleanedContent = flashcardTool.content
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
                    options: { numberOfCards: 'standard', difficulty: 'medium' },
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
            const newContent = regularStudyTools.filter((tool: StudyToolContent) => !existingIds.has(tool.id))

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
    try {
      // Import html2pdf dynamically to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default

      // Clean AI introduction text from content
      let cleanedContent = content.content
      // Remove common AI introduction patterns
      const patterns = [
        /^Of course[.,]?\s*/i,
        /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
        /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
        /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
        /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
        /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
        /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
        /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
      ]

      for (const pattern of patterns) {
        cleanedContent = cleanedContent.replace(pattern, '')
      }

      cleanedContent = cleanedContent.replace(/^[\s*]+/, '').trim()

      // Create a hidden div with properly styled markdown content
      const tempDiv = document.createElement('div')
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.top = '-9999px'
      tempDiv.style.width = '800px'
      tempDiv.style.fontFamily = 'Arial, sans-serif'
      tempDiv.style.fontSize = '12px'
      tempDiv.style.lineHeight = '1.6'
      tempDiv.style.color = '#000000'
      tempDiv.style.backgroundColor = '#ffffff'
      tempDiv.style.padding = '20px'

      // Convert markdown to HTML using a simple approach
      // Since we already have ReactMarkdown rendering, let's use basic HTML conversion
      let htmlContent = cleanedContent
        // Headers
        .replace(/^# (.*$)/gm, '<h1 style="font-size: 18px; font-weight: bold; margin: 16px 0 8px 0; color: #333; border-bottom: 2px solid #eee; padding-bottom: 8px;">$1</h1>')
        .replace(/^## (.*$)/gm, '<h2 style="font-size: 16px; font-weight: bold; margin: 14px 0 6px 0; color: #333;">$1</h2>')
        .replace(/^### (.*$)/gm, '<h3 style="font-size: 14px; font-weight: bold; margin: 12px 0 4px 0; color: #333;">$1</h3>')
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: bold;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
        // Code inline
        .replace(/`([^`]+)`/g, '<code style="background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
        // Lists - basic conversion
        .replace(/^[-*] (.*$)/gm, '<li style="margin: 4px 0;">$1</li>')
        .replace(/^(\d+)\. (.*$)/gm, '<li style="margin: 4px 0; list-style-type: decimal;">$2</li>')
        // Line breaks
        .replace(/\n\n/g, '</p><p style="margin: 8px 0; line-height: 1.6;">')
        .replace(/\n/g, '<br>')

      // Wrap in paragraph tags
      htmlContent = '<p style="margin: 8px 0; line-height: 1.6;">' + htmlContent + '</p>'

      // Wrap lists properly
      htmlContent = htmlContent.replace(/(<li[^>]*>.*?<\/li>)/gs, (match) => {
        if (!match.includes('<ul') && !match.includes('<ol')) {
          return '<ul style="margin: 8px 0; padding-left: 20px;">' + match + '</ul>'
        }
        return match
      })

      tempDiv.innerHTML = `
        <div style="max-width: 800px;">
          <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 16px; color: #333; text-align: center;">${content.title}</h1>
          <div style="margin-bottom: 12px; text-align: center; color: #666; font-size: 10px;">
            Generated on ${new Date(content.createdAt).toLocaleDateString()} at ${new Date(content.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div>${htmlContent}</div>
        </div>
      `

      document.body.appendChild(tempDiv)

      // Configure PDF options
      const options = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true
        },
        jsPDF: {
          unit: 'in',
          format: 'letter',
          orientation: 'portrait',
          compressPDF: true
        },
        pagebreak: { mode: 'avoid-all' }
      }

      // Generate and save PDF
      await html2pdf().set(options).from(tempDiv).save()

      // Clean up
      document.body.removeChild(tempDiv)

    } catch (error) {
      console.error('Failed to download PDF:', error)
      throw error
    }
  },

  downloadAsDOCX: async (content: StudyToolContent): Promise<void> => {
    try {
      // Import md-to-docx dynamically to avoid SSR issues
      const { convertMarkdownToDocx, downloadDocx } = await import('@mohtasham/md-to-docx')

      // Clean AI introduction text from content
      let cleanedContent = content.content
      // Remove common AI introduction patterns (same as PDF cleaning)
      const patterns = [
        /^Of course[.,]?\s*/i,
        /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
        /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
        /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
        /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
        /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
        /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
        /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
      ]

      for (const pattern of patterns) {
        cleanedContent = cleanedContent.replace(pattern, '')
      }

      cleanedContent = cleanedContent.replace(/^[\s*]+/, '').trim()

      // Add document header with title and generation info
      const documentHeader = `# ${content.title}

*Generated on ${new Date(content.createdAt).toLocaleDateString()} at ${new Date(content.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}*

---

`

      const fullMarkdown = documentHeader + cleanedContent

      // Configure DOCX options for professional document
      const options = {
        documentType: 'document' as const,
        style: {
          // Font sizes
          titleSize: 24,
          heading1Size: 20,
          heading2Size: 18,
          heading3Size: 16,
          heading4Size: 14,
          heading5Size: 12,
          paragraphSize: 11,
          listItemSize: 11,
          codeBlockSize: 10,
          blockquoteSize: 11,

          // Spacing
          headingSpacing: 240, // 12pt before/after
          paragraphSpacing: 120, // 6pt before/after
          lineSpacing: 1.15,

          // Alignment
          paragraphAlignment: 'JUSTIFIED' as const,
          heading1Alignment: 'CENTER' as const,
          heading2Alignment: 'LEFT' as const,
          heading3Alignment: 'LEFT' as const,

          // Document direction
          direction: 'LTR' as const
        }
      }

      // Convert markdown to DOCX blob
      const docxBlob = await convertMarkdownToDocx(fullMarkdown, options)

      // Generate safe filename
      const safeFileName = `${content.title.replace(/[^a-zA-Z0-9\s]/g, '_').replace(/\s+/g, '_')}.docx`

      // Download the DOCX file
      downloadDocx(docxBlob, safeFileName)

    } catch (error) {
      console.error('Failed to download DOCX:', error)

      // Fallback: download as formatted text file
      try {
        console.log('Falling back to text file download...')

        let cleanedContent = content.content
        // Apply same cleaning
        const patterns = [
          /^Of course[.,]?\s*/i,
          /^Here\s+(?:is|are)\s+(?:a|an|the|some)?\s*(?:comprehensive|detailed|smart)?\s*[^.]*?\s*on\s+the\s*["'""']?[^"'""']*?["'""']?[^.]*?[.,*]\s*/i,
          /^Here\s+are\s+comprehensive\s+smart\s+notes\s+on\s+the\s+["'""'][^"'""']*["'""']\s+syllabus[.,*\s]*/i,
          /^Here\s+(?:is|are)\s+[^.]*?(?:notes|summary|guide|analysis)[^.]*?[.,*]\s*/i,
          /^I'll\s+(?:create|provide|generate)\s+[^.]*?[.,]\s*/i,
          /^(?:Certainly|Absolutely|Sure)[.,]?\s*/i,
          /created\s+using\s+the\s+[^.]*?methodology[.,]?\s*/i,
          /^(?:Let me|I'd be happy to)\s+[^.]*?[.,]\s*/i
        ]

        for (const pattern of patterns) {
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