-- Add actual token count columns to chat_sessions table
-- Migration: 20250219_add_actual_token_counts

-- Add columns for actual token counts from Gemini API
ALTER TABLE public.chat_sessions 
  ADD COLUMN IF NOT EXISTS actual_system_tokens INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_document_tokens INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS token_count_method VARCHAR(20) DEFAULT 'estimation';

-- Add comment explaining the columns
COMMENT ON COLUMN public.chat_sessions.actual_system_tokens IS 'Actual token count for system prompt from Gemini API';
COMMENT ON COLUMN public.chat_sessions.actual_document_tokens IS 'Actual token count for document context from Gemini API';
COMMENT ON COLUMN public.chat_sessions.token_count_method IS 'Method used for token counting: api_count or estimation';

-- Index for querying by token count method (for analytics)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_token_method ON public.chat_sessions(token_count_method);

-- Update existing rows to explicitly mark as estimation
UPDATE public.chat_sessions 
SET token_count_method = 'estimation' 
WHERE token_count_method IS NULL;

-- Make token_count_method NOT NULL after setting defaults
ALTER TABLE public.chat_sessions 
  ALTER COLUMN token_count_method SET NOT NULL,
  ALTER COLUMN token_count_method SET DEFAULT 'estimation';

-- Add check constraint for valid token count methods
ALTER TABLE public.chat_sessions
  ADD CONSTRAINT check_token_count_method 
  CHECK (token_count_method IN ('api_count', 'estimation'));

-- Conversations table metadata structure documentation
-- The metadata JSONB column in conversations table will store:
-- {
--   "systemPromptTokens": number,
--   "documentContextTokens": number,
--   "tokenCountMethod": "api_count" | "estimation",
--   "lastTokenValidation": ISO timestamp,
--   "estimateAccuracy": number (optional, % difference between estimate and actual)
-- }

COMMENT ON COLUMN public.conversations.metadata IS 'JSONB metadata including token counts: systemPromptTokens, documentContextTokens, tokenCountMethod, lastTokenValidation, estimateAccuracy';
