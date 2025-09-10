# Database Schema (Supabase)

We use three core entities plus storage:
- documents
- sections (child of documents)
- outputs (one table with type enum: 'summary' | 'notes' | 'study_guide')
- storage bucket: documents (private)

See SQL: supabase/schema.sql

## Notes
- RLS is enabled; only service role may read/write for MVP.
- No authentication flows in MVP; all operations happen on server via service key.
- Outputs are stored per section and for the 'overall' pseudo-section (section_id NULL, overall=true).

## Indices
- sections(document_id, ord)
- outputs(document_id, section_id, type)

## Migrations
Apply SQL in Supabase SQL Editor. If you later adopt the Supabase CLI, port these into migration files.

