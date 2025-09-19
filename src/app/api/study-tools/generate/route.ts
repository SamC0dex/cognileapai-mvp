import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { createClient } from '@supabase/supabase-js'
import { getStudyToolPrompt, generateStudyToolTitle, type StudyToolPromptType } from '@/lib/study-tools-prompts'
// import { addRetryAttempt, classifyError } from '@/lib/retry-manager'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Allow longer execution time for comprehensive generation
export const maxDuration = 60

interface StudyToolGenerateRequest {
  type: StudyToolPromptType
  documentId?: string
  conversationId?: string
  // Flashcard-specific options
  flashcardOptions?: {
    numberOfCards: 'fewer' | 'standard' | 'more'
    difficulty: 'easy' | 'medium' | 'hard'
    customInstructions?: string
  }
}

interface DocumentSection {
  id: string
  title: string
  page_start: number
  page_end: number
  parent_id?: string
}

interface DocumentChunk {
  id: string
  chunk_index: number
  content: string
  page_start: number
  page_end: number
  section_title?: string
  token_count: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export async function POST(req: NextRequest) {
  try {
    const { type, documentId, conversationId, flashcardOptions }: StudyToolGenerateRequest = await req.json()

    // Debug logging
    console.log('[StudyTools] API Request received:', { type, documentId, conversationId })
    console.log('[StudyTools] Environment check:', {
      hasGeminiKey: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    // Validate request
    if (!type || !['study-guide', 'smart-summary', 'smart-notes', 'flashcards'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid study tool type' },
        { status: 400 }
      )
    }

    if (!documentId && !conversationId) {
      return NextResponse.json(
        { error: 'Either documentId or conversationId is required' },
        { status: 400 }
      )
    }

    // Verify Gemini API key
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    let documentContent = ''
    let documentTitle = 'Untitled Document'

    // Get content based on documentId or conversationId
    if (documentId) {
      console.log('[StudyTools] Fetching document:', documentId)

      // Fetch document and its content
      const { data: document, error: docError } = await supabase
        .from('documents')
        .select('id, title, processing_status, document_content')
        .eq('id', documentId)
        .single()

      console.log('[StudyTools] Document query result:', { document, docError })

      if (docError || !document) {
        console.error('[StudyTools] Document not found:', { documentId, docError })
        return NextResponse.json(
          { error: 'Document not found or inaccessible' },
          { status: 404 }
        )
      }

      if (document.processing_status !== 'completed') {
        return NextResponse.json(
          { error: 'Document is still processing. Please wait for processing to complete.' },
          { status: 422 }
        )
      }

      documentTitle = document.title

      // Check if document has content
      if (!document.document_content) {
        console.warn('[StudyTools] Document has no content:', documentId)
        return NextResponse.json(
          { error: 'Document has no content available for study tool generation' },
          { status: 422 }
        )
      }

      // Use document content directly
      documentContent = document.document_content
      console.log('[StudyTools] Using document content length:', documentContent.length)

    } else if (conversationId) {
      // Fetch conversation messages
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, title, document_id')
        .eq('id', conversationId)
        .single()

      if (convError || !conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      documentTitle = conversation.title || 'Conversation'

      // Fetch conversation messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('sequence_number', { ascending: true })

      if (messagesError) {
        return NextResponse.json(
          { error: 'Failed to fetch conversation content' },
          { status: 500 }
        )
      }

      if (!messages || messages.length === 0) {
        return NextResponse.json(
          { error: 'Conversation has no content available for study tool generation' },
          { status: 422 }
        )
      }

      // Build conversation content
      documentContent = buildConversationContent(messages as Message[])

      // If conversation has an associated document, include document context
      if (conversation.document_id) {
        const { data: docData } = await supabase
          .from('documents')
          .select('document_content')
          .eq('id', conversation.document_id)
          .single()

        if (docData && docData.document_content) {
          documentContent = `# Document Context:\n\n${docData.document_content}\n\n# Conversation:\n\n${documentContent}`
        }
      }
    }

    // Validate content length
    if (documentContent.length < 100) {
      return NextResponse.json(
        { error: 'Insufficient content for generating meaningful study materials' },
        { status: 422 }
      )
    }

    // Get the appropriate prompts for the study tool type
    const { systemPrompt, userPrompt } = getStudyToolPrompt(
      type as StudyToolPromptType,
      documentContent,
      documentTitle,
      flashcardOptions ? {
        numberOfCards: flashcardOptions.numberOfCards,
        difficulty: flashcardOptions.difficulty,
        customInstructions: flashcardOptions.customInstructions
      } : undefined
    )

    console.log(`[StudyTools] Generating ${type} for "${documentTitle}" (${documentContent.length} chars)`)

    // Generate study tool using Gemini 2.5 Pro
    const startTime = Date.now()

    const result = await generateText({
      model: google('gemini-2.5-pro'),
      system: systemPrompt,
      prompt: userPrompt,
      maxTokens: undefined, // No limit for comprehensive generation
      topK: 40,
      temperature: 0.7,
    })

    const duration = Date.now() - startTime
    console.log(`[StudyTools] Generated ${type} in ${duration}ms (${result.text.length} chars)`)

    // Special handling for flashcards - parse JSON response
    let processedContent = result.text
    let flashcardData = null

    if (type === 'flashcards') {
      try {
        // Parse the JSON response from the AI
        const cleanedText = result.text.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
        flashcardData = JSON.parse(cleanedText)

        if (!Array.isArray(flashcardData)) {
          throw new Error('Flashcard data is not an array')
        }

        // Validate flashcard structure
        flashcardData.forEach((card, index) => {
          if (!card.question || !card.answer || !card.id) {
            throw new Error(`Invalid flashcard at index ${index}: missing required fields`)
          }
        })

        console.log(`[StudyTools] Successfully parsed ${flashcardData.length} flashcards`)

        // Keep the original JSON for content field
        processedContent = result.text
      } catch (error) {
        console.error('[StudyTools] Failed to parse flashcard JSON:', error)
        return NextResponse.json(
          { error: 'Failed to parse generated flashcards. The AI response was not in the expected format.' },
          { status: 500 }
        )
      }
    }

    // Generate appropriate title
    const generatedTitle = generateStudyToolTitle(type as StudyToolPromptType, documentTitle)

    // Save to database - map frontend types to database types
    const dbType = type === 'smart-summary' ? 'summary' :
                   type === 'smart-notes' ? 'notes' :
                   type === 'study-guide' ? 'study_guide' :
                   type === 'flashcards' ? 'flashcards' : type

    let outputId: string | null = null

    // For conversation-based study tools, we need to find the associated document or use a workaround
    let saveDocumentId = documentId
    if (!saveDocumentId && conversationId) {
      // For conversation-based study tools, try to get the document from conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('document_id')
        .eq('id', conversationId)
        .single()

      saveDocumentId = conversation?.document_id
    }

    try {
      const insertData: any = {
        section_id: null,
        overall: true,
        type: dbType,
        payload: {
          title: generatedTitle,
          content: processedContent,
          type: type,
          documentId: documentId,
          conversationId: conversationId,
          createdAt: new Date().toISOString(),
          // Include flashcard-specific data
          ...(type === 'flashcards' && flashcardData ? {
            cards: flashcardData,
            options: flashcardOptions,
            metadata: {
              model: 'gemini-2.5-pro',
              duration,
              contentLength: processedContent.length,
              sourceContentLength: documentContent.length,
              totalCards: flashcardData.length,
              avgDifficulty: flashcardOptions?.difficulty || 'medium'
            }
          } : {
            metadata: {
              model: 'gemini-2.5-pro',
              duration,
              contentLength: processedContent.length,
              sourceContentLength: documentContent.length
            }
          })
        }
      }

      // Add document_id if we have one, otherwise skip it for conversation-only study tools
      if (saveDocumentId) {
        insertData.document_id = saveDocumentId
      } else {
        // For conversation-only study tools, we still need a document_id for the schema
        // Create a temporary placeholder or modify schema - for now log and skip database save
        console.warn('[StudyTools] No document_id available for conversation-based study tool, skipping database save')
        console.log('[StudyTools] Study tool generated successfully but not saved to database - conversation-only mode')
      }

      if (saveDocumentId) {
        const { data: output, error: saveError } = await supabase
          .from('outputs')
          .insert(insertData)
          .select('id')
          .single()

        if (saveError) {
          console.error('[StudyTools] Failed to save to database:', saveError)
        } else {
          outputId = output?.id || null
          console.log('[StudyTools] Saved to database with ID:', outputId)
        }
      }
    } catch (saveError) {
      console.error('[StudyTools] Database save error:', saveError)
    }

    return NextResponse.json({
      success: true,
      id: outputId,
      title: generatedTitle,
      content: processedContent,
      type,
      documentId,
      conversationId,
      // Include flashcard-specific data in response
      ...(type === 'flashcards' && flashcardData ? {
        cards: flashcardData,
        options: flashcardOptions
      } : {}),
      metadata: {
        generatedAt: new Date().toISOString(),
        model: 'gemini-2.5-pro',
        duration,
        contentLength: processedContent.length,
        sourceContentLength: documentContent.length,
        ...(type === 'flashcards' && flashcardData ? {
          totalCards: flashcardData.length,
          avgDifficulty: flashcardOptions?.difficulty || 'medium'
        } : {})
      }
    })

  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error('Unknown error')
    console.error('[StudyTools] Generation failed:', errorInstance)

    // Log detailed error information for debugging
    console.error('[StudyTools] Error name:', errorInstance.name)
    console.error('[StudyTools] Error message:', errorInstance.message)
    console.error('[StudyTools] Error stack:', errorInstance.stack)

    // Handle specific error types
    if (errorInstance.message.includes('API key') || errorInstance.message.includes('GOOGLE_GENERATIVE_AI_API_KEY')) {
      return NextResponse.json(
        {
          error: 'AI service configuration error: API key not found or invalid'
        },
        { status: 500 }
      )
    }

    if (errorInstance.message.includes('quota') || errorInstance.message.includes('rate limit')) {
      return NextResponse.json(
        {
          error: 'AI service temporarily unavailable. Please try again in a few minutes.'
        },
        { status: 429 }
      )
    }

    if (errorInstance.message.includes('fetch')) {
      return NextResponse.json(
        {
          error: 'Network error connecting to AI service. Please check your internet connection.'
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to generate study tool. Please try again.',
        details: errorInstance.message
      },
      { status: 500 }
    )
  }
}

/**
 * Build structured document content from chunks and sections
 */
function buildDocumentContentFromChunks(chunks: DocumentChunk[], sections: DocumentSection[]): string {
  let content = ''
  let currentPage = 0

  // Create a map of sections by page range for structure
  const sectionsByPage = new Map<number, DocumentSection[]>()
  sections.forEach(section => {
    for (let page = section.page_start; page <= section.page_end; page++) {
      if (!sectionsByPage.has(page)) {
        sectionsByPage.set(page, [])
      }
      sectionsByPage.get(page)!.push(section)
    }
  })

  // Build content by processing chunks in order
  for (const chunk of chunks) {
    // Add page break indicators when page changes
    if (chunk.page_start !== currentPage) {
      if (currentPage > 0) {
        content += '\n\n---\n\n'
      }
      content += `# Page ${chunk.page_start}\n\n`

      // Add section headers for this page
      const pageSections = sectionsByPage.get(chunk.page_start) || []
      pageSections.forEach(section => {
        if (section.title) {
          const headingLevel = '#'.repeat(Math.min(3, 6)) // Default to h3 for sections
          content += `${headingLevel} ${section.title}\n\n`
        }
      })

      currentPage = chunk.page_start
    }

    // Add the chunk content
    content += `${chunk.content}\n\n`
  }

  return content.trim()
}

/**
 * Build structured document content from sections (legacy - kept for compatibility)
 */
function buildDocumentContent(sections: DocumentSection[]): string {
  let content = ''
  let currentPage = 0

  for (const section of sections) {
    // Add page break indicators
    if (section.page_start && section.page_start !== currentPage) {
      if (currentPage > 0) {
        content += '\n\n---\n\n'
      }
      content += `# Page ${section.page_start}\n\n`
      currentPage = section.page_start
    }

    // Add section with appropriate heading level
    const headingLevel = '#'.repeat(Math.min(3, 6))

    if (section.title) {
      content += `${headingLevel} ${section.title}\n\n`
    }
  }

  return content.trim()
}

/**
 * Build conversation content from messages
 */
function buildConversationContent(messages: Message[]): string {
  let content = ''

  for (const message of messages) {
    const timestamp = new Date(message.created_at).toLocaleString()
    const roleLabel = message.role === 'user' ? 'User' : 'Assistant'

    content += `## ${roleLabel} (${timestamp})\n\n${message.content}\n\n---\n\n`
  }

  return content.trim()
}