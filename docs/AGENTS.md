# Agents and Roles

We use a multi‑agent workflow optimized for speed and determinism.

- Builder (Codex CLI): writes code, files, and tests following prompts.
- Verifier (Warp ADE): runs commands, checks logs, inspects UI, fetches docs via MCP, and files issues.
- Reviewer (Copilot Chat in IDE): suggests micro‑refactors and highlights smells; not authoritative.
- Orchestrator (You): kicks off phases, reviews PRs, and merges.

## Ground Rules
- One phase = one branch = one PR. Link prompt JSON in PR body.
- No secrets in prompts or commits. Prompts reference env var names.
- Use pnpm scripts and absolute paths in commands.
- For git commands, always use --no-pager variants.

## Division of Labor
- Phase 1 (Scaffold & Tokens): Builder leads, Verifier checks run and theme.
- Phase 2 (Supabase): Builder applies SQL; Verifier confirms tables and RLS.
- Phase 3 (Upload): Builder implements API + client; Verifier uploads PDFs.
- Phase 4 (Outline): Builder implements algorithm; Verifier validates coverage.
- Phase 5 (Generation): Builder wires Gemini; Verifier validates JSON schemas.
- Phase 6 (Export): Builder outputs MD; Verifier compares against UI.
- Phase 7 (Polish): Both handle a11y/perf.

## Handoff Checklist per Phase
- Builder pushes branch and opens PR with checklist:
  - [ ] Scope complete
  - [ ] No secrets
  - [ ] pnpm dev works
  - [ ] Basic screenshots (dark+light)
  - [ ] SQL applied (if relevant)
- Verifier comments with:
  - [ ] Functional checks
  - [ ] A11y/perf notes
  - [ ] Suggestions

## MCP Usage (Warp ADE)
- Use MCP Web/Docs providers to pull latest docs:
  - Tailwind, Radix UI, Supabase JS, Google Generative AI SDK
- Summarize relevant snippets into the PR as citations when useful.

