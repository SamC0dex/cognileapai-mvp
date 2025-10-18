-- Migration: Fix document checksum constraint to be per-user
-- Description: Change checksum uniqueness from global to per-user
--              This allows the same document to be uploaded by different users
--              while still preventing duplicate uploads by the same user
-- Date: 2025-02-19
-- Issue: Users couldn't upload documents that other users had uploaded

-- Drop the old global uniqueness constraint
DROP INDEX IF EXISTS public.documents_checksum_unique_idx;

-- Create new per-user uniqueness constraint
-- This allows the same document to exist once per user
CREATE UNIQUE INDEX documents_checksum_unique_idx
  ON public.documents (user_id, checksum)
  WHERE checksum IS NOT NULL AND user_id IS NOT NULL;

-- Add comment explaining the constraint
COMMENT ON INDEX public.documents_checksum_unique_idx IS 
  'Ensures each user can upload the same document only once, but different users can upload the same document';
