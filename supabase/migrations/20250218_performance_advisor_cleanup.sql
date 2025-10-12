-- Migration: Remove redundant indexes flagged by performance advisor

DROP INDEX IF EXISTS public.idx_conversations_document_id;
DROP INDEX IF EXISTS public.outputs_doc_sec_type_idx;
