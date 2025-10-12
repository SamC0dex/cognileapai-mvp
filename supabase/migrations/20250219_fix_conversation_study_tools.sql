-- =====================================================
-- Migration: Fix Conversation-Based Study Tools
-- Description: Enable saving study tools generated from conversations
--              without requiring a document_id
-- Date: 2025-02-19
-- =====================================================

-- =====================================================
-- STEP 1: Add conversation_id column to outputs
-- =====================================================

-- Add conversation_id column
ALTER TABLE public.outputs
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS outputs_conversation_id_idx ON public.outputs(conversation_id);

COMMENT ON COLUMN public.outputs.conversation_id IS 'Optional: Conversation from which study tool was generated';

-- =====================================================
-- STEP 2: Make document_id nullable
-- =====================================================

-- Drop the old NOT NULL constraint
ALTER TABLE public.outputs
ALTER COLUMN document_id DROP NOT NULL;

-- Add check constraint to ensure either document_id or conversation_id is present
ALTER TABLE public.outputs
ADD CONSTRAINT outputs_source_check CHECK (
  document_id IS NOT NULL OR conversation_id IS NOT NULL
);

COMMENT ON CONSTRAINT outputs_source_check ON public.outputs IS 
  'Ensure study tool has either a document or conversation source';

-- =====================================================
-- STEP 3: Remove duplicate entries before applying unique constraint
-- =====================================================

-- First, identify and remove duplicates, keeping only the most recent one for each combination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(document_id::text, ''),
        COALESCE(conversation_id::text, ''),
        COALESCE(section_id::text, ''),
        overall,
        type
      ORDER BY created_at DESC
    ) as rn
  FROM public.outputs
)
DELETE FROM public.outputs
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Log the number of duplicates removed
DO $$
DECLARE
  duplicates_count INTEGER;
BEGIN
  GET DIAGNOSTICS duplicates_count = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate study tool(s)', duplicates_count;
END $$;

-- =====================================================
-- STEP 4: Drop old unique constraint and create new one
-- =====================================================

-- Drop old unique constraint that required document_id
ALTER TABLE public.outputs
DROP CONSTRAINT IF EXISTS outputs_document_id_section_id_overall_type_key;

-- Create new unique constraint that handles both document and conversation sources
-- This prevents duplicate study tools for the same source and type
CREATE UNIQUE INDEX IF NOT EXISTS outputs_unique_source_type_idx 
ON public.outputs (
  COALESCE(document_id::text, ''), 
  COALESCE(conversation_id::text, ''),
  COALESCE(section_id::text, ''),
  overall,
  type
);

COMMENT ON INDEX outputs_unique_source_type_idx IS
  'Ensure unique study tool per source (document or conversation) and type';

-- =====================================================
-- STEP 5: Add RLS policies for conversation-based outputs
-- =====================================================

-- Drop existing policies to recreate them with conversation support
DROP POLICY IF EXISTS "Users can view outputs of their documents" ON public.outputs;
DROP POLICY IF EXISTS "Users can insert outputs for their documents" ON public.outputs;
DROP POLICY IF EXISTS "Users can update outputs of their documents" ON public.outputs;
DROP POLICY IF EXISTS "Users can delete outputs of their documents" ON public.outputs;

-- Users can view outputs of their documents OR conversations
CREATE POLICY "Users can view their outputs"
ON public.outputs
FOR SELECT
USING (
  -- User owns the document
  (document_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  ))
  OR
  -- User owns the conversation
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = outputs.conversation_id
      AND conversations.user_id = auth.uid()
  ))
);

-- Users can insert outputs for their documents OR conversations
CREATE POLICY "Users can insert their outputs"
ON public.outputs
FOR INSERT
WITH CHECK (
  -- User owns the document
  (document_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  ))
  OR
  -- User owns the conversation
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = outputs.conversation_id
      AND conversations.user_id = auth.uid()
  ))
);

-- Users can update outputs of their documents OR conversations
CREATE POLICY "Users can update their outputs"
ON public.outputs
FOR UPDATE
USING (
  -- User owns the document
  (document_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  ))
  OR
  -- User owns the conversation
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = outputs.conversation_id
      AND conversations.user_id = auth.uid()
  ))
);

-- Users can delete outputs of their documents OR conversations
CREATE POLICY "Users can delete their outputs"
ON public.outputs
FOR DELETE
USING (
  -- User owns the document
  (document_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  ))
  OR
  -- User owns the conversation
  (conversation_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = outputs.conversation_id
      AND conversations.user_id = auth.uid()
  ))
);

-- =====================================================
-- STEP 6: Add helpful comments
-- =====================================================

COMMENT ON POLICY "Users can view their outputs" ON public.outputs IS
  'Users can view study tools from their documents or conversations';

COMMENT ON POLICY "Users can insert their outputs" ON public.outputs IS
  'Users can create study tools from their documents or conversations';

COMMENT ON POLICY "Users can update their outputs" ON public.outputs IS
  'Users can update study tools from their documents or conversations';

COMMENT ON POLICY "Users can delete their outputs" ON public.outputs IS
  'Users can delete study tools from their documents or conversations';

-- =====================================================
-- STEP 7: Update indexes for better query performance
-- =====================================================

-- Drop old index that only considered document_id
DROP INDEX IF EXISTS outputs_doc_sec_type_idx;

-- Create new indexes for both document and conversation queries
CREATE INDEX IF NOT EXISTS outputs_document_type_idx 
ON public.outputs(document_id, type) 
WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS outputs_conversation_type_idx 
ON public.outputs(conversation_id, type) 
WHERE conversation_id IS NOT NULL;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Verify migration
DO $$
DECLARE
  policy_count INTEGER;
  column_exists BOOLEAN;
BEGIN
  -- Check if conversation_id column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'outputs'
      AND column_name = 'conversation_id'
  ) INTO column_exists;

  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'outputs';

  IF column_exists THEN
    RAISE NOTICE 'Migration successful: conversation_id column added';
  ELSE
    RAISE WARNING 'Migration may have failed: conversation_id column not found';
  END IF;

  RAISE NOTICE 'Outputs table now has % RLS policies', policy_count;
END $$;
