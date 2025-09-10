# API Contracts

All endpoints are Next.js Route Handlers under /app/api. Node runtime (not Edge) for PDF parsing.

Auth: Server-only with Supabase service role key. No client-side direct DB access for MVP.

Content types:
- JSON for standard responses
- text/event-stream for SSE
- text/markdown for export

## POST /api/upload
Body: multipart/form-data with fields:
- file: PDF (text-selectable) OR
- text: string (long text) and optional title

Response 200: { docId: string, title: string, pageCount: number }
Side effects:
- Store blob in Supabase Storage (documents/)
- Extract text and metadata
- Create Document row
- Create placeholder Sections or run outline immediately (configurable). MVP: run outline in same request.

Errors: 400 (invalid), 415 (unsupported), 413 (too large), 500 (parse error)

## GET /api/docs/[id]
Response 200: { document, sections, outputsStatus }

## POST /api/generate/[id]?type=study-guide|summary|notes
Body: { sectionIds: string[] }
Response: text/event-stream
Events: { sectionId, state: 'start'|'chunk'|'done'|'error', chunk?: string }

## GET /api/export/[id]?format=md
Response: text/markdown

## Internal Libraries
- lib/ai/gemini.ts: choose model:
  - heavy: gemini-2.5-pro for long sections/overall
  - fast: gemini-2.5-flash for typical sections
- lib/schemas.ts: zod schemas SummarySchema, NotesSchema, GuideSchema, SectionSchema, DocumentSchema
- lib/server/supabase.ts: server client using service role

## Error Handling
- Return typed error JSON: { code, message }
- Stream errors in SSE as state='error'
- Log only metadata, never raw document text

