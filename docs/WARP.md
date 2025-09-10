# Warp ADE + MCP Guide

Use Warp ADE to verify builds, run commands, and fetch up‑to‑date docs via MCP providers.

## Common Sessions
- Dev server: pnpm dev
- Run Next.js lint: pnpm lint
- Type check: pnpm typecheck

## MCP for Docs
Ask Warp ADE to fetch authoritative snippets when implementing or reviewing:
- TailwindCSS: utility usage and configuration
- Radix UI: component primitive props and accessibility
- Supabase JS: storage upload/download, service role client
- Google Generative AI Node SDK: Gemini 2.5 streaming JSON techniques

Prompt pattern:
"Search the latest docs for <topic>. Summarize the precise code usage and constraints. Return citations." 

## Secure Secrets Handling
- Store keys in .env.local
- In commands, use env vars (PowerShell example):
  $env:GOOGLE_AI_API_KEY = (Get-Content .env.local | Select-String 'GOOGLE_AI_API_KEY').ToString()
- Never echo secrets.

## Verification Checklist per Phase
- Phase 1: UI loads, theme toggles, skeletons animate, contrast AA.
- Phase 2: DB connection works; RLS blocks anon; service role succeeds.
- Phase 3: Upload 100-page PDF; document appears; blob exists in storage.
- Phase 4: Outline coverage and counts sane; debug view consistent.
- Phase 5: Streaming starts <1s; schemas valid.
- Phase 6: Markdown export equals UI.

