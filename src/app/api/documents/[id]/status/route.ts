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
        // Realistic phase-based progress simulation
        const now = new Date()
        const createdAt = new Date(document.created_at)
        const elapsedSeconds = (now.getTime() - createdAt.getTime()) / 1000

        // Define realistic processing phases with natural timing
        const phases = [
          { name: 'Uploading and validating...', start: 0, end: 15, duration: 3 },
          { name: 'Extracting text content...', start: 15, end: 45, duration: 6 },
          { name: 'Breaking into sections...', start: 45, end: 75, duration: 8 },
          { name: 'Indexing for search...', start: 75, end: 90, duration: 6 },
          { name: 'Finalizing...', start: 90, end: 98, duration: Infinity }
        ]

        let cumulativeTime = 0
        let currentPhase = phases[0]
        let phaseProgress = 0

        // Find current phase and calculate progress within that phase
        for (const phase of phases) {
          if (elapsedSeconds <= cumulativeTime + phase.duration) {
            currentPhase = phase
            const timeInPhase = elapsedSeconds - cumulativeTime

            // Use easing curve for natural feeling progress
            // Start fast, slow down towards end (ease-out curve)
            const normalizedTime = Math.min(timeInPhase / phase.duration, 1)
            const easedProgress = phase.duration === Infinity ? 0.8 : (1 - Math.pow(1 - normalizedTime, 2))

            phaseProgress = phase.start + (phase.end - phase.start) * easedProgress
            break
          }
          cumulativeTime += phase.duration
        }

        // If we have chunks, boost progress slightly (indicates real processing)
        if (document.chunk_count && document.chunk_count > 0) {
          phaseProgress = Math.max(phaseProgress, 85)
          currentPhase = { name: 'Finalizing...', start: 85, end: 98, duration: Infinity }
        }

        // Use clean progress without random variation
        progress = Math.round(Math.max(0, Math.min(98, phaseProgress)))
        message = currentPhase.name
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