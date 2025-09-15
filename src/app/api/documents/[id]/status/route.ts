import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document processing status
    const { data: document, error } = await supabase
      .from('documents')
      .select('id, title, processing_status, chunk_count, error_message, created_at, updated_at')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching document status:', error)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Calculate progress estimate based on processing status
    let progress = 0
    let message = 'Unknown status'

    switch (document.processing_status) {
      case 'pending':
        progress = 0
        message = 'Waiting to start processing...'
        break
      case 'processing':
        progress = 50
        message = 'Processing document for chat...'
        break
      case 'completed':
        progress = 100
        message = `Ready for chat! (${document.chunk_count || 0} sections indexed)`
        break
      case 'failed':
        progress = 0
        message = `Processing failed: ${document.error_message || 'Unknown error'}`
        break
      default:
        progress = 0
        message = 'Unknown processing status'
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        processing_status: document.processing_status,
        chunk_count: document.chunk_count || 0,
        error_message: document.error_message,
        created_at: document.created_at,
        updated_at: document.updated_at
      },
      progress: {
        percentage: progress,
        message,
        phase: document.processing_status
      }
    })

  } catch (error) {
    console.error('Error in document status API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}