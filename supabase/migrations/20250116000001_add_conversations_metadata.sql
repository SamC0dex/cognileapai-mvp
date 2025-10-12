-- Add metadata column to conversations table for storing token breakdown
-- This allows us to persist system prompt and document context tokens across page refreshes

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add index for efficient metadata queries
CREATE INDEX IF NOT EXISTS conversations_metadata_idx ON public.conversations USING gin (metadata);

-- Add comment for documentation
COMMENT ON COLUMN public.conversations.metadata IS 'Stores token breakdown (systemPromptTokens, documentContextTokens) and other conversation metadata';
