import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StudyToolUpdateRequest {
  id: string
  title: string
}

export async function POST(req: NextRequest) {
  try {
    const { id, title }: StudyToolUpdateRequest = await req.json()

    console.log('[StudyTools] Update request:', { id, title })

    // Validate request
    if (!id || !title) {
      return NextResponse.json(
        { error: 'ID and title are required' },
        { status: 400 }
      )
    }

    // Verify Supabase client is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    // First, get the current record to update its payload
    console.log('[StudyTools] Fetching record with ID:', id)
    const { data: currentRecord, error: fetchError } = await supabase
      .from('outputs')
      .select('payload')
      .eq('id', id)
      .single()

    console.log('[StudyTools] Fetch result:', { currentRecord, fetchError })

    if (fetchError) {
      console.error('[StudyTools] Failed to fetch current record:', fetchError)
      return NextResponse.json(
        { error: 'Study tool not found', details: fetchError.message },
        { status: 404 }
      )
    }

    if (!currentRecord) {
      return NextResponse.json(
        { error: 'Study tool not found' },
        { status: 404 }
      )
    }

    // Update the title in the payload
    console.log('[StudyTools] Current payload structure:', currentRecord.payload)
    const updatedPayload = {
      ...currentRecord.payload,
      title: title.trim()
    }
    console.log('[StudyTools] Updated payload structure:', updatedPayload)

    // Update the record in the database
    console.log('[StudyTools] Updating with payload:', updatedPayload)
    const { error: updateError } = await supabase
      .from('outputs')
      .update({
        payload: updatedPayload
        // Note: removed updated_at in case it's auto-managed by database or doesn't exist
      })
      .eq('id', id)

    console.log('[StudyTools] Update result:', { updateError })

    if (updateError) {
      console.error('[StudyTools] Failed to update study tool:', updateError)
      return NextResponse.json(
        { error: 'Failed to update study tool in database', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[StudyTools] Successfully updated study tool title: ${id} -> "${title}"`)

    return NextResponse.json({
      success: true,
      message: 'Study tool updated successfully'
    })

  } catch (error) {
    console.error('[StudyTools] Update failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to update study tool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}