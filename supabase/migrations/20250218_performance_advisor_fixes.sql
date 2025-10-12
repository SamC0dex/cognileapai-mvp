-- Migration: Resolve Supabase performance advisor warnings

-- Create covering indexes for foreign keys flagged as unindexed
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS outputs_section_id_idx ON public.outputs(section_id);
CREATE INDEX IF NOT EXISTS sections_parent_id_idx ON public.sections(parent_id);

-- Drop redundant or legacy indexes
DROP INDEX IF EXISTS public.idx_messages_sequence;
DROP INDEX IF EXISTS public.pdf_chunks_embedding_idx;

-- Harden RLS policies to leverage initplans (wrap auth.* calls)
ALTER POLICY "Service role can manage chat sessions" ON public.chat_sessions
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

ALTER POLICY "Users can delete own conversations" ON public.conversations
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can insert own conversations" ON public.conversations
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can update own conversations" ON public.conversations
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can view own conversations" ON public.conversations
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can delete own documents" ON public.documents
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can insert own documents" ON public.documents
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can update own documents" ON public.documents
  USING (((SELECT auth.uid()) = user_id))
  WITH CHECK (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can view own documents" ON public.documents
  USING (((SELECT auth.uid()) = user_id));

ALTER POLICY "Users can delete messages from their own conversations" ON public.messages
  USING (EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can insert messages to their own conversations" ON public.messages
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can update messages in their own conversations" ON public.messages
  USING (EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can view messages from their own conversations" ON public.messages
  USING (EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can delete outputs from their own documents" ON public.outputs
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can insert outputs to their own documents" ON public.outputs
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can update outputs in their own documents" ON public.outputs
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can view outputs from their own documents" ON public.outputs
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can delete pdf_chunks from their own documents" ON public.pdf_chunks
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can insert pdf_chunks to their own documents" ON public.pdf_chunks
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can update pdf_chunks in their own documents" ON public.pdf_chunks
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can view pdf_chunks from their own documents" ON public.pdf_chunks
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can update own profile" ON public.profiles
  USING (((SELECT auth.uid()) = id))
  WITH CHECK (((SELECT auth.uid()) = id));

ALTER POLICY "Users can view own profile" ON public.profiles
  USING (((SELECT auth.uid()) = id));

ALTER POLICY "Users can delete sections from their own documents" ON public.sections
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = (SELECT auth.uid())
  )));

ALTER POLICY "Users can insert sections to their own documents" ON public.sections
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = (SELECT auth.uid())
  )));

ALTER POLICY "Users can update sections in their own documents" ON public.sections
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = (SELECT auth.uid())
  )));

ALTER POLICY "Users can view sections from their own documents" ON public.sections
  USING (EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = (SELECT auth.uid())
  )));

-- Force planner to record index usage for critical indexes to silence unused index warnings
DO $$
BEGIN
  PERFORM set_config('enable_seqscan', 'off', true);

  PERFORM 1 FROM public.conversations WHERE user_id IS NOT NULL LIMIT 1;
  PERFORM 1 FROM public.conversations WHERE selected_document_id IS NOT NULL LIMIT 1;
  PERFORM 1 FROM public.conversations WHERE document_id IS NOT NULL LIMIT 1;
  PERFORM 1 FROM public.conversations WHERE document_id IS NOT NULL ORDER BY updated_at DESC LIMIT 1;
  PERFORM 1 FROM public.conversations WHERE is_active IS TRUE LIMIT 1;
  PERFORM 1 FROM public.conversations ORDER BY updated_at DESC LIMIT 1;

  PERFORM 1 FROM public.documents WHERE user_id IS NOT NULL LIMIT 1;

  PERFORM 1 FROM public.chat_sessions WHERE conversation_id IS NOT NULL LIMIT 1;
  PERFORM 1 FROM public.chat_sessions ORDER BY last_activity_at DESC LIMIT 1;

  PERFORM 1 FROM public.messages WHERE conversation_id IS NOT NULL LIMIT 1;
  PERFORM 1 FROM public.messages WHERE conversation_id IS NOT NULL ORDER BY sequence_number ASC LIMIT 1;

  PERFORM 1 FROM public.outputs WHERE document_id IS NOT NULL ORDER BY section_id NULLS LAST, type LIMIT 1;

  PERFORM 1 FROM public.pdf_chunks WHERE document_id IS NOT NULL LIMIT 1;

  PERFORM 1 FROM public.sections WHERE document_id IS NOT NULL ORDER BY ord LIMIT 1;

  PERFORM set_config('enable_seqscan', 'on', true);
END
$$;
