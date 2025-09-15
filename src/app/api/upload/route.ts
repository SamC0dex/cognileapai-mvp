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

    // Parse PDF to get page count
    let pageCount = 0
    try {
      // Use pdf2json which is more stable and doesn't have debug code issues
      const PDFParser = require('pdf2json')

      // Create a promise wrapper for pdf2json
      const parsePdf = () => {
        return new Promise((resolve, reject) => {
          const pdfParser = new PDFParser()

          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError))
          })

          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            // pdf2json provides page count via Pages array length
            const pages = pdfData.Pages ? pdfData.Pages.length : 0
            resolve(pages)
          })

          // Parse the buffer
          pdfParser.parseBuffer(buffer)
        })
      }

      pageCount = await parsePdf() as number
      console.log('PDF parsed successfully, pages:', pageCount)
    } catch (parseError) {
      console.error('PDF parsing error:', parseError)
      // Continue with pageCount = 0, don't fail the upload
    }

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
    
    // Create document record with processing status
    const { data: document, error: dbError } = await supabase
      .from('documents')
      .insert({
        title: file.name.replace('.pdf', ''),
        page_count: pageCount,
        bytes: file.size,
        storage_path: uploadData.path,
        processing_status: 'processing'
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

    // Create basic sections (legacy support)
    await supabase
      .from('sections')
      .insert({
        document_id: document.id,
        ord: 1,
        title: 'Full Document',
        page_start: 1,
        page_end: pageCount > 0 ? pageCount : 1
      })

    // Start background PDF processing for chat functionality
    // This runs asynchronously so upload response is fast
    startBackgroundProcessing(document.id, buffer).catch(error => {
      console.error(`Background PDF processing failed for document ${document.id}:`, error)
      // Update document with error status
      supabase
        .from('documents')
        .update({
          processing_status: 'failed',
          error_message: error instanceof Error ? error.message : 'Processing failed'
        })
        .eq('id', document.id)
        .then(() => console.log(`Updated document ${document.id} with error status`))
    })

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        hasStudyGuide: false,
        hasSummary: false,
        hasNotes: false,
        processing_status: 'processing'
      }
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Enhanced background processing function with PDF text extraction
async function startBackgroundProcessing(documentId: string, buffer: Buffer) {
  try {
    console.log(`[Background] Starting PDF processing for document ${documentId}`)

    // Update status to processing
    await supabase
      .from('documents')
      .update({ processing_status: 'processing' })
      .eq('id', documentId)

    // Extract text content from PDF using pdf2json
    let extractedText = ''
    try {
      const PDFParser = require('pdf2json')

      const extractText = () => {
        return new Promise<string>((resolve, reject) => {
          const pdfParser = new PDFParser()

          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(errData.parserError))
          })

          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            try {
              let text = ''
              if (pdfData.Pages) {
                pdfData.Pages.forEach((page: any) => {
                  if (page.Texts) {
                    page.Texts.forEach((textItem: any) => {
                      if (textItem.R) {
                        textItem.R.forEach((textRun: any) => {
                          if (textRun.T) {
                            // Decode the text and add spaces
                            text += decodeURIComponent(textRun.T) + ' '
                          }
                        })
                      }
                    })
                    text += '\n' // Add line break after each page
                  }
                })
              }
              resolve(text.trim())
            } catch (error) {
              reject(error)
            }
          })

          pdfParser.parseBuffer(buffer)
        })
      }

      extractedText = await extractText()
      console.log(`[Background] Extracted ${extractedText.length} characters from PDF`)

      // Store the extracted text in the document_content column
      await supabase
        .from('documents')
        .update({
          processing_status: 'completed',
          chunk_count: 1, // For now, we store as one chunk
          document_content: extractedText // Store the full text
        })
        .eq('id', documentId)

      console.log(`[Background] PDF text extraction completed for document ${documentId}`)

    } catch (textError) {
      console.error(`[Background] Text extraction failed, but marking as completed:`, textError)

      // Even if text extraction fails, mark as completed so UI shows ready
      await supabase
        .from('documents')
        .update({
          processing_status: 'completed',
          chunk_count: 0,
          error_message: 'Text extraction failed, but document is available'
        })
        .eq('id', documentId)
    }

  } catch (error) {
    console.error(`[Background] Processing failed for document ${documentId}:`, error)

    await supabase
      .from('documents')
      .update({
        processing_status: 'failed',
        error_message: error instanceof Error ? error.message : 'Processing failed'
      })
      .eq('id', documentId)
  }
}