-- Migration: Add checksum support for document deduplication
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS checksum TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS documents_checksum_unique_idx
  ON public.documents (checksum)
  WHERE checksum IS NOT NULL;
