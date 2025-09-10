# Quick Start (Non-Technical)

Follow these steps exactly. You can hand them to your AI agents or run them yourself.

## 1) Prepare Environment
- Install Node 20+ and pnpm 9+
- Create a GitHub repo and clone it into C:\\Users\\swami\\Coding\\CogniLeapAI - MVP
- Copy .env.example to .env.local and fill values (do not commit):
  - GOOGLE_AI_API_KEY
  - GEMINI_HEAVY_MODEL=gemini-2.5-pro
  - GEMINI_FAST_MODEL=gemini-2.5-flash
  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - SUPABASE_PROJECT_REF, SUPABASE_BUCKET_DOCUMENTS=documents

## 2) Kick Off Phase 1 (Scaffold)
- Use Codex CLI with prompts/01_repo_init.json
- After it finishes, run the app: pnpm dev
- Verify light/dark theme toggle works.

## 3) Apply Supabase Schema
- Open Supabase dashboard → SQL editor → paste supabase/schema.sql then supabase/policies.sql → Run
- Confirm bucket "documents" exists (private)

## 4) Implement Upload & Outline
- Run Codex with prompts/03_upload_and_extract.json then prompts/04_outline_detection.json
- Upload a 100-page text PDF; check outline in UI.

## 5) Generation & Export
- Run prompts/05_generation_streaming.json and prompts/06_export_markdown.json

## 6) QA & Polish
- Follow docs/QA_CHECKLIST.md

## Important
- Never paste API keys into prompts or PRs.
- When unsure, ask Warp ADE to fetch docs via MCP and summarize exact usage.

