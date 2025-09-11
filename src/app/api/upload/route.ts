import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    console.log('Upload API called')
    
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }
    
    console.log('Processing file:', file.name, file.size)
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Sanitize filename for Supabase storage
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${Date.now()}-${sanitizedFileName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, buffer, {
        contentType: 'application/pdf'
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }
    
    console.log('File uploaded successfully:', uploadData.path)
    
    // Create document record
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title: file.name.replace('.pdf', ''),
        page_count: 0,
        bytes: file.size,
        storage_path: uploadData.path
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabase.storage.from('documents').remove([uploadData.path])
      return NextResponse.json({ error: 'Failed to save document' }, { status: 500 })
    }
    
    console.log('Document created successfully:', document.id)
    
    // Create basic sections
    await supabase
      .from('sections')
      .insert({
        document_id: document.id,
        ord: 1,
        title: 'Full Document',
        page_start: 1,
        page_end: 1
      })
    
    return NextResponse.json({ 
      success: true, 
      document: {
        ...document,
        hasStudyGuide: false,
        hasSummary: false,
        hasNotes: false
      }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}