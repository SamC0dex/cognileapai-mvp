-- Migration: Add PDF Chat Support with Intelligent Context Management
-- This enables NotebookLM-style document chat functionality

-- Enable vector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- PDF content chunks with embeddings for smart context retrieval
CREATE TABLE IF NOT EXISTS public.pdf_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL,
  section_title TEXT,
  embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimensions
  token_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique chunk ordering per document
  UNIQUE(document_id, chunk_index)
);

-- Indexes for fast similarity search and retrieval
CREATE INDEX IF NOT EXISTS pdf_chunks_document_id_idx ON public.pdf_chunks(document_id);
CREATE INDEX IF NOT EXISTS pdf_chunks_embedding_idx ON public.pdf_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add PDF processing status and metadata to documents
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add document selection support to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS selected_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Create index for faster document-based conversation queries
CREATE INDEX IF NOT EXISTS conversations_selected_document_idx
  ON public.conversations(selected_document_id) WHERE selected_document_id IS NOT NULL;

-- Add citation support to messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS citations JSONB;

-- Function to update document processing status
CREATE OR REPLACE FUNCTION update_document_processing_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update chunk count when chunks are added/removed
  UPDATE public.documents
  SET
    chunk_count = (
      SELECT COUNT(*)
      FROM public.pdf_chunks
      WHERE document_id = NEW.document_id
    ),
    processing_status = CASE
      WHEN (SELECT COUNT(*) FROM public.pdf_chunks WHERE document_id = NEW.document_id) > 0
      THEN 'completed'
      ELSE 'processing'
    END,
    updated_at = NOW()
  WHERE id = NEW.document_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update document status
CREATE TRIGGER update_document_status_trigger
  AFTER INSERT OR DELETE ON public.pdf_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_processing_status();

-- RLS policies for pdf_chunks
ALTER TABLE public.pdf_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pdf_chunks_select_policy" ON public.pdf_chunks
  FOR SELECT USING (true);

CREATE POLICY "pdf_chunks_insert_policy" ON public.pdf_chunks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pdf_chunks_update_policy" ON public.pdf_chunks
  FOR UPDATE USING (true);

CREATE POLICY "pdf_chunks_delete_policy" ON public.pdf_chunks
  FOR DELETE USING (true);