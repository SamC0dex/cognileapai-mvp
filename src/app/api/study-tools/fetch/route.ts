import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StudyToolsFetchRequest {
  documentId?: string
  conversationId?: string
}

export async function POST(req: NextRequest) {
  try {
    const { documentId, conversationId }: StudyToolsFetchRequest = await req.json()

    console.log('[StudyTools] Fetch request:', { documentId, conversationId })

    // Validate request - need at least one identifier
    if (!documentId && !conversationId) {
      return NextResponse.json(
        { error: 'Either documentId or conversationId is required' },
        { status: 400 }
      )
    }

    let outputs = []

    if (documentId) {
      // Fetch study tools for specific document
      const { data, error } = await supabase
        .from('outputs')
        .select('*')
        .eq('document_id', documentId)
        .eq('overall', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[StudyTools] Database fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch study tools from database' },
          { status: 500 }
        )
      }

      outputs = data || []
    } else if (conversationId) {
      // For conversation-based fetch, we need to find outputs that match the conversation
      // This is more complex as we need to match the conversationId in the payload
      const { data, error } = await supabase
        .from('outputs')
        .select('*')
        .eq('overall', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[StudyTools] Database fetch error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch study tools from database' },
          { status: 500 }
        )
      }

      // Filter by conversationId in payload
      outputs = (data || []).filter(output =>
        output.payload?.conversationId === conversationId
      )
    }

    // Transform database outputs to frontend format
    const studyTools = outputs.map(output => {
      const payload = output.payload || {}

      // Map database types back to frontend types
      const frontendType = output.type === 'summary' ? 'smart-summary' :
                          output.type === 'notes' ? 'smart-notes' :
                          output.type === 'study_guide' ? 'study-guide' : output.type

      return {
        id: output.id, // Use database ID
        type: frontendType,
        title: payload.title || 'Untitled',
        content: payload.content || '',
        createdAt: new Date(output.created_at),
        documentId: payload.documentId || null,
        conversationId: payload.conversationId || null,
        isGenerating: false,
        generationProgress: 100,
        metadata: payload.metadata || {}
      }
    })

    console.log('[StudyTools] Fetched', studyTools.length, 'study tools from database')

    return NextResponse.json({
      success: true,
      studyTools,
      count: studyTools.length
    })

  } catch (error) {
    console.error('[StudyTools] Fetch failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to fetch study tools. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}