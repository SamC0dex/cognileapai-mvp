# CogniLeap MVP — Master Implementation Plan

This is the single source of truth for building the MVP. It is designed for AI agents (Codex CLI, Warp ADE) and a human overseer. Follow phases in order. Each phase has:
- Objectives
- Deliverables
- Tasks (step-by-step)
- Acceptance criteria
- Owner (default: Codex CLI for build, Warp ADE for verification)

Important principles:
- Calm UI, no default AI template look. Teal/Amber accents only.
- Section-first: all outputs align to detected outline.
- Deterministic export: UI ↔ Markdown match.
- Strict JSON generation with zod schemas.
- No secrets in code or commands. Use .env.local.

## Phase 0 — System Prep
Objectives: Ensure environment is ready on Windows 11 with WSL optional.

Tasks:
1) Install Node ≥ 20, pnpm ≥ 9 (or npm). Verify: node -v, pnpm -v
2) Create an empty GitHub repo and clone it to C:\Users\swami\Coding\CogniLeapAI - MVP
3) Create .env.local from .env.example and paste your keys locally (never commit):
   - GOOGLE_AI_API_KEY
   - GEMINI_* model ids (as provided)
   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
   - SUPABASE_PROJECT_REF, SUPABASE_BUCKET_DOCUMENTS=documents
4) In Supabase project, create a Storage bucket named "documents" (public: false)

Acceptance: Commands return versions; .env.local exists and not tracked; bucket created.

## Phase 1 — Scaffold & Tokens
Objectives: Create Next.js app (App Router, TS), Tailwind with custom tokens, Radix primitives, Framer Motion, next-themes.

Deliverables:
- Next.js project scaffold
- Tokenized theme (light/dark) with teal/amber accents
- Base layout and routes stubbed: /, /dashboard, /doc/[id], /doc/[id]/study-guide, /summary, /notes, /flashcards (stub)
- Core components: Header (theme toggle), OutlineList, DocCard, ExportBar, Skeletons

Tasks:
1) Scaffold app:
   - npx create-next-app@latest cogni-leap --ts --app --eslint --tailwind --src-dir --use-pnpm --no-experimental-app
   - Move contents into repo root if created in subfolder.
2) Install deps: radix-ui primitives, class-variance-authority, tailwind-merge, framer-motion, next-themes, zod, react-query, @supabase/supabase-js, pdf-parse, pdfjs-dist, jose (for future), @google/generative-ai
3) Configure Tailwind and design tokens per docs/UI_DESIGN_SYSTEM.md
4) Implement theme toggle and base shell with calm motion.

Acceptance: App runs (pnpm dev). Theme toggle works. Routes load with placeholders and skeletons.

Owner: Build (Codex CLI). Verify (Warp ADE visual pass + a11y smoke).

## Phase 2 — Supabase & Data Model
Objectives: Create database tables, RLS, and storage policies. Wire server SDK.

Deliverables:
- Tables: documents, sections, outputs (summary, notes, study_guide) or a unified outputs table
- RLS: service role only for write; anonymous read via server only (no client RLS for MVP)
- Storage bucket policies: service role only (server writes/reads)
- Server helper: lib/server/supabase.ts

Tasks:
1) Execute SQL in supabase/schema.sql and supabase/policies.sql (from SQL editor)
2) Add environment vars
3) Implement server client using service role

Acceptance: You can insert a test document and list it from API route locally.

## Phase 3 — Upload & Text Extraction
Objectives: Accept PDF upload (≤ 20MB, up to 200 pages). Extract text preserving page breaks.

Deliverables:
- POST /api/upload: multipart, stores blob in Supabase Storage, extracts text, creates Document and initial Sections (empty), returns { docId, title, pageCount }
- Extraction: pdf-parse primary; pdfjs-dist fallback
- Normalization: remove hyphenation, standardize bullets, keep page breaks

Tasks:
1) Implement robust file upload handler (Edge disabled; use Node runtime)
2) Stream file to Supabase Storage (documents/)
3) Extract text and compute pageCount, bytes
4) Persist Document

Acceptance: Upload a real PDF (100+ pages) → document appears in dashboard.

## Phase 4 — Outline Detection (Hybrid Heuristic)
Objectives: Convert extracted text into a reliable hierarchical outline.

Deliverables:
- Algorithm per docs/API_CONTRACTS.md and PRD Section 14
- Stored Section rows with ord, title, pageStart, pageEnd
- DevPanel to visualize outline confidence and repair passes

Tasks:
1) Implement candidate heading detection: numeric/roman/alpha patterns, title case, ALL CAPS, punctuation-light, whitespace gaps
2) Scoring function (1–10) and threshold promotion
3) Merge tiny fragments (<120 chars); sanity caps; repair pass
4) Optional LLM title repair (Gemini) when titles empty or broken (toggle off by default)

Acceptance: On 3 test PDFs, section coverage ≥ 95%, mean section length 300–3000 chars. Manual sanity passes.

## Phase 5 — Generation & Streaming
Objectives: For each section and overall, generate Study Guide, Summary, Notes using Gemini with strict zod schemas and SSE streaming to the client.

Deliverables:
- POST /api/generate/:id?type=study-guide|summary|notes (SSE)
- Zod schemas in lib/schemas.ts
- Gemini wrapper in lib/ai/gemini.ts selecting model by payload size (2.5 pro vs 2.5 flash)
- Client UI showing per-section streaming content with validation and repair pass

Tasks:
1) Implement JSON-first prompts and zod validation
2) On zod failure, one repair pass with prior JSON as base
3) Store outputs per section and overall in DB

Acceptance: Streaming visible within 1s; schemas valid; 5 random sections pass checks.

## Phase 6 — Export
Objectives: Deterministic Markdown export mirroring on‑screen content.

Deliverables:
- GET /api/export/:id?format=md → text/markdown
- UI: ExportBar with Copy All and Download

Acceptance: Export compared to UI; headings and order match; anchors included.

## Phase 7 — Polish & QA
Objectives: A11y, skeletons, motion tuning, performance.

Deliverables:
- Reduced motion support; focus rings; AA contrast
- Telemetry events (lightweight) to console or simple endpoint

Acceptance: Manual QA plan passes (docs/QA_CHECKLIST.md).

## Phase 8 — Optional MCP/Docs Assist
Use Warp ADE with MCP to pull up-to-date docs for Tailwind, Radix, Supabase, and Google AI SDK during implementation. See docs/WARP.md for commands and prompt snippets.

## Done Definition (MVP)
- Upload a 100-page text PDF → Outline detects sensibly → Study Guide/Summary/Notes stream per section and overall → Export to Markdown mirrors UI → Light/Dark themes with calm motion → No gradients unless extremely subtle.

