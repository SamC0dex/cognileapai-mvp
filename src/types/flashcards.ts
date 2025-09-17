export interface FlashcardOptions {
  numberOfCards: 'fewer' | 'standard' | 'more'  // Fewer=5-10, Standard=10-20, More=20-30
  difficulty: 'easy' | 'medium' | 'hard'
  customInstructions?: string
}

export interface FlashcardEntry {
  id: string
  question: string     // Front of card - short, 1-5 words ideal for memorization
  answer: string       // Back of card - detailed explanation/definition
  difficulty: 'easy' | 'medium' | 'hard'
  topic?: string      // Optional categorization from source content
  metadata?: {
    sourceSection?: string
    pageNumber?: number
    confidence?: number  // AI confidence in question quality (0-1)
  }
}

export interface FlashcardSet {
  id: string
  title: string
  cards: FlashcardEntry[]
  options: FlashcardOptions
  createdAt: Date
  documentId?: string
  conversationId?: string
  metadata: {
    totalCards: number
    avgDifficulty: string
    generationTime: number
    model: string
    sourceContentLength: number
    isGenerating?: boolean
    generationProgress?: number
  }
}

export interface FlashcardProgress {
  currentIndex: number
  totalCards: number
  completedCards: number
  correctAnswers: number
  isFullscreen: boolean
  showAnswer: boolean
  sessionStartTime: Date
}

export interface FlashcardStudySession {
  flashcardSetId: string
  progress: FlashcardProgress
  answers: {
    cardId: string
    isCorrect: boolean
    timeSpent: number
    attempts: number
  }[]
  startedAt: Date
  completedAt?: Date
}

// Constants for flashcard generation
export const FLASHCARD_COUNTS = {
  fewer: { min: 5, max: 10, description: 'Fewer cards focusing on key concepts' },
  standard: { min: 10, max: 20, description: 'Standard coverage of main topics' },
  more: { min: 20, max: 30, description: 'Comprehensive coverage of all topics' }
} as const

export const FLASHCARD_DIFFICULTIES = {
  easy: {
    description: 'Basic definitions and simple concepts',
    promptModifier: 'Focus on fundamental terms and basic understanding'
  },
  medium: {
    description: 'Moderate complexity with some analysis',
    promptModifier: 'Include analytical thinking and connections between concepts'
  },
  hard: {
    description: 'Complex analysis and application',
    promptModifier: 'Emphasize critical thinking, application, and complex relationships'
  }
} as const