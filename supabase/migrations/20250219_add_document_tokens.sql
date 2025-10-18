-- Add actual token count column to documents table
-- Migration: 20250219_add_document_tokens

-- Add column for actual token count from Gemini API
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS actual_tokens INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS token_count_method VARCHAR(20) DEFAULT 'estimation';

-- Add comment explaining the columns
COMMENT ON COLUMN public.documents.actual_tokens IS 'Actual token count for document content from Gemini API';
COMMENT ON COLUMN public.documents.token_count_method IS 'Method used for token counting: api_count or estimation';

-- Index for filtering by token count (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_documents_actual_tokens ON public.documents(actual_tokens) WHERE actual_tokens IS NOT NULL;

-- Update existing rows to explicitly mark as estimation if they don't have actual counts
UPDATE public.documents 
SET token_count_method = 'estimation' 
WHERE token_count_method IS NULL AND actual_tokens IS NULL;

-- Make token_count_method NOT NULL after setting defaults
ALTER TABLE public.documents 
  ALTER COLUMN token_count_method SET NOT NULL,
  ALTER COLUMN token_count_method SET DEFAULT 'estimation';

-- Add check constraint for valid token count methods
ALTER TABLE public.documents
  ADD CONSTRAINT check_document_token_count_method 
  CHECK (token_count_method IN ('api_count', 'estimation'));
