import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabase as serviceSupabase } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership and get storage path
    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .select('id, user_id, storage_path')
      .eq('id', id)
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (doc.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!doc.storage_path) {
      return NextResponse.json({ error: 'No file available' }, { status: 409 })
    }

    // Create short-lived signed URL via service role (does not rely on Storage RLS)
    const { data: signed, error: signErr } = await serviceSupabase
      .storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60 * 5) // 5 minutes

    if (signErr || !signed) {
      return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
    }

    return NextResponse.json({ url: signed.signedUrl })
  } catch (e) {
    console.error('[signed-url] Error', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
