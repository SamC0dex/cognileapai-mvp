import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    // Fetch all documents with their outputs to determine what's been generated
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select(`
        *,
        outputs(type)
      `)
      .order('created_at', { ascending: false })
    
    if (documentsError) {
      console.error('Database error:', documentsError)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }
    
    // Transform documents to include output flags
    const transformedDocuments = documents.map(doc => {
      const outputs = doc.outputs || []
      return {
        id: doc.id,
        title: doc.title,
        pageCount: doc.page_count,
        bytes: doc.bytes,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        hasStudyGuide: outputs.some((o: any) => o.type === 'study_guide'),
        hasSummary: outputs.some((o: any) => o.type === 'summary'),
        hasNotes: outputs.some((o: any) => o.type === 'notes')
      }
    })
    
    return NextResponse.json({ documents: transformedDocuments })
    
  } catch (error) {
    console.error('Fetch documents error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}