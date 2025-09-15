import { createClient } from '@supabase/supabase-js'
import PDFParser from 'pdf2json'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function extractContentFromExistingPDF(documentId) {
  try {
    console.log(`Starting content extraction for document: ${documentId}`)

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, storage_path')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      throw new Error(`Document not found: ${docError?.message}`)
    }

    console.log(`Found document: ${document.title}`)
    console.log(`Storage path: ${document.storage_path}`)

    // Download the PDF file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storage_path)

    if (downloadError) {
      throw new Error(`Failed to download PDF: ${downloadError.message}`)
    }

    console.log('PDF downloaded successfully')

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log(`PDF size: ${buffer.length} bytes`)

    // Extract text using pdf2json
    const extractedText = await new Promise((resolve, reject) => {
      const pdfParser = new PDFParser()

      pdfParser.on('pdfParser_dataError', (errData) => {
        reject(new Error(errData.parserError))
      })

      pdfParser.on('pdfParser_dataReady', (pdfData) => {
        try {
          let text = ''
          if (pdfData.Pages) {
            pdfData.Pages.forEach((page, pageNum) => {
              console.log(`Processing page ${pageNum + 1}/${pdfData.Pages.length}`)
              if (page.Texts) {
                page.Texts.forEach((textItem) => {
                  if (textItem.R) {
                    textItem.R.forEach((textRun) => {
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

    console.log(`Extracted ${extractedText.length} characters from PDF`)

    // Show first 500 characters as preview
    console.log('\nPreview of extracted content:')
    console.log('=' * 50)
    console.log(extractedText.substring(0, 500) + '...')
    console.log('=' * 50)

    // Update document with extracted content
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        document_content: extractedText,
        processing_status: 'completed',
        chunk_count: 1
      })
      .eq('id', documentId)

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`)
    }

    console.log('\n✅ Successfully extracted and saved PDF content!')
    console.log(`Document ${documentId} now has ${extractedText.length} characters of content`)

    return extractedText

  } catch (error) {
    console.error('❌ Error extracting PDF content:', error.message)
    throw error
  }
}

// Run the extraction for the specific document
const documentId = 'db908786-f095-40d5-a30d-6aa243e1dac3'

extractContentFromExistingPDF(documentId)
  .then(() => {
    console.log('\n🎉 Content extraction completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Content extraction failed:', error)
    process.exit(1)
  })