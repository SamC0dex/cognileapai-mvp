-- Migration: Migrate from OpenAI embeddings (1536d) to FREE Transformers.js embeddings (384d)
-- This migration handles the dimension change and reprocessing strategy

-- Step 1: Create backup of existing embeddings if any exist
CREATE TABLE IF NOT EXISTS public.pdf_chunks_backup AS
SELECT * FROM public.pdf_chunks WHERE embedding IS NOT NULL;

-- Step 2: Drop the old embedding index (1536 dimensions)
DROP INDEX IF EXISTS pdf_chunks_embedding_idx;

-- Step 3: Update the embedding column to support 384 dimensions
-- Note: This will clear existing embeddings, but they'll be regenerated with FREE system
ALTER TABLE public.pdf_chunks
DROP COLUMN IF EXISTS embedding;

ALTER TABLE public.pdf_chunks
ADD COLUMN embedding VECTOR(384); -- New FREE embedding dimensions

-- Step 4: Create new index for 384-dimensional vectors
CREATE INDEX IF NOT EXISTS pdf_chunks_embedding_384_idx ON public.pdf_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Step 5: Add migration tracking
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS embedding_version TEXT DEFAULT 'free_v1',
ADD COLUMN IF NOT EXISTS requires_reprocessing BOOLEAN DEFAULT FALSE;

-- Step 6: Mark all documents with existing chunks for reprocessing
UPDATE public.documents
SET requires_reprocessing = TRUE,
    embedding_version = 'free_v1',
    processing_status = 'pending'
WHERE id IN (
  SELECT DISTINCT document_id
  FROM public.pdf_chunks
);

-- Step 7: Clear all existing embeddings to force regeneration with FREE system
UPDATE public.pdf_chunks
SET embedding = NULL;

-- Step 8: Create function to check if document needs reprocessing
CREATE OR REPLACE FUNCTION needs_embedding_reprocessing(doc_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.documents
    WHERE id = doc_id
    AND (requires_reprocessing = TRUE OR embedding_version != 'free_v1')
  );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Update the status update function to handle new embedding version
CREATE OR REPLACE FUNCTION update_document_processing_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-update chunk count when chunks are added/removed
  UPDATE public.documents
  SET
    chunk_count = (
      SELECT COUNT(*)
      FROM public.pdf_chunks
      WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
    ),
    processing_status = CASE
      WHEN (
        SELECT COUNT(*)
        FROM public.pdf_chunks
        WHERE document_id = COALESCE(NEW.document_id, OLD.document_id)
        AND embedding IS NOT NULL
      ) > 0
      THEN 'completed'
      ELSE 'processing'
    END,
    requires_reprocessing = FALSE,
    embedding_version = 'free_v1',
    updated_at = NOW()
  WHERE id = COALESCE(NEW.document_id, OLD.document_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comments for documentation
COMMENT ON COLUMN public.pdf_chunks.embedding IS 'FREE 384-dimensional embeddings from mixedbread-ai/mxbai-embed-xsmall-v1';
COMMENT ON COLUMN public.documents.embedding_version IS 'Version of embedding system used: free_v1 = Transformers.js 384d';
COMMENT ON COLUMN public.documents.requires_reprocessing IS 'TRUE if document needs embedding regeneration';

-- Step 11: Create index on reprocessing flag for efficient queries
CREATE INDEX IF NOT EXISTS documents_reprocessing_idx
ON public.documents(requires_reprocessing)
WHERE requires_reprocessing = TRUE;

-- Migration completed successfully
-- All documents will be reprocessed with FREE embeddings on next upload/access