import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with service role key for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface StudyToolDeleteRequest {
  id: string
}

export async function POST(req: NextRequest) {
  try {
    const { id }: StudyToolDeleteRequest = await req.json()

    console.log('[StudyTools] Delete request:', { id })

    // Validate request
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
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

    // First, verify the record exists before attempting deletion
    console.log('[StudyTools] Verifying record exists with ID:', id)
    const { data: existingRecord, error: fetchError } = await supabase
      .from('outputs')
      .select('id, payload')
      .eq('id', id)
      .single()

    console.log('[StudyTools] Verification result:', { existingRecord, fetchError })

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found, which is handled below
      console.error('[StudyTools] Failed to verify record:', fetchError)
      return NextResponse.json(
        { error: 'Failed to verify study tool', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!existingRecord) {
      console.log('[StudyTools] Record not found, treating as already deleted')
      return NextResponse.json({
        success: true,
        message: 'Study tool already deleted or does not exist'
      })
    }

    // Delete the record from the database
    console.log('[StudyTools] Deleting record with ID:', id)
    const { error: deleteError } = await supabase
      .from('outputs')
      .delete()
      .eq('id', id)

    console.log('[StudyTools] Delete result:', { deleteError })

    if (deleteError) {
      console.error('[StudyTools] Failed to delete study tool:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete study tool from database', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log(`[StudyTools] Successfully deleted study tool: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Study tool deleted successfully'
    })

  } catch (error) {
    console.error('[StudyTools] Delete failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete study tool',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}