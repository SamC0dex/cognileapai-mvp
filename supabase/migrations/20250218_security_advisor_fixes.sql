-- Migration: Address Supabase Security Advisor warnings
-- 1. Harden database functions by setting an explicit search_path
-- 2. Relocate the vector extension out of the public schema
-- 3. Prepare for enabling leaked password protection (requires Pro plan)

ALTER EXTENSION vector SET SCHEMA extensions;

-- Trigger helper: keep updated_at columns in sync
CREATE OR REPLACE FUNCTION public.update_conversations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Trigger helper: enforce a single active conversation per document
CREATE OR REPLACE FUNCTION public.ensure_single_active_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.is_active IS TRUE THEN
    UPDATE public.conversations
    SET is_active = FALSE
    WHERE document_id = NEW.document_id
      AND id <> NEW.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger helper: update conversation timestamps when messages change
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Generic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Maintain document processing metadata for pdf_chunks changes
CREATE OR REPLACE FUNCTION public.update_document_processing_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  target_document_id uuid;
  total_chunks integer := 0;
  embedded_chunks integer := 0;
BEGIN
  target_document_id := COALESCE(NEW.document_id, OLD.document_id);

  IF target_document_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COUNT(*) AS total_chunks,
    COUNT(*) FILTER (WHERE pc.embedding IS NOT NULL) AS embedded_chunks
  INTO total_chunks, embedded_chunks
  FROM public.pdf_chunks AS pc
  WHERE pc.document_id = target_document_id;

  UPDATE public.documents
  SET
    chunk_count = total_chunks,
    processing_status = CASE
      WHEN embedded_chunks > 0 THEN 'completed'
      ELSE 'processing'
    END,
    requires_reprocessing = FALSE,
    embedding_version = 'free_v1',
    updated_at = NOW()
  WHERE id = target_document_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Similarity search utility for embeddings
CREATE OR REPLACE FUNCTION public.find_similar_chunks(
  query_embedding vector,
  document_id uuid,
  similarity_threshold double precision DEFAULT 0.7,
  max_results integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  content text,
  page_start integer,
  page_end integer,
  section_title text,
  token_count integer,
  similarity double precision
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT
    pc.id,
    pc.content,
    pc.page_start,
    pc.page_end,
    pc.section_title,
    pc.token_count,
    1 - extensions.cosine_distance(pc.embedding, query_embedding) AS similarity
  FROM public.pdf_chunks AS pc
  WHERE pc.document_id = find_similar_chunks.document_id
    AND pc.embedding IS NOT NULL
    AND 1 - extensions.cosine_distance(pc.embedding, query_embedding) >= similarity_threshold
  ORDER BY extensions.cosine_distance(pc.embedding, query_embedding)
  LIMIT max_results;
$function$;

-- Profile bootstrapper triggered from auth.users inserts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  );

  RETURN NEW;
END;
$function$;

-- NOTE: Leaked password protection can only be enabled on Pro plan projects.
-- Upgrade the project tier and enable "Leaked password protection" in the Auth settings
-- dashboard (or via the Management API) once available.
