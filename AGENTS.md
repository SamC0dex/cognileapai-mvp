# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains App Router routes and API handlers (`src/app/api/**`); keep segments kebab-case with colocated loading/error UI.
- `src/components` supplies reusable UI, while `src/lib`, `src/hooks`, and `src/types` hold chat logic, Supabase utilities, and shared types; styles live in `src/styles`, assets in `public`, docs in `docs/`.

## Build, Test, and Development Commands
- `pnpm dev` serves `http://localhost:3000`; `pnpm dev:turbo` switches to Turbopack.
- `pnpm build` + `pnpm start` mimic production; `pnpm build:analyze` adds bundle metrics.
- `pnpm lint` enforces the Next.js + ESLint config, and `pnpm typecheck` runs strict TypeScript with no emit.

## Coding Style & Naming Conventions
- TypeScript strict mode, functional React components, and PascalCase filenames in `src/components` (e.g., `DocumentPanel.tsx`).
- CamelCase utilities/hooks (`useChatStore.ts`); rely on Tailwind classes rather than nested CSS and keep class lists readable.
- Run `pnpm lint` before pushing; formatting is handled there, so no extra Prettier step.

## Testing Guidelines
- Use `pnpm lint && pnpm typecheck` as the minimum pre-review gate.
- When touching `/api/chat/**`, execute `testDocumentChatEndpoint()` from `src/app/api/chat/document/test.ts` in a browser console or Node REPL to confirm streaming paths.
- Manually exercise affected UI, ensuring clean console/network output plus intact keyboard shortcuts and loading states.

## Workflow Expectations
- Start with deep analysis, list impacted files, and capture a TodoWrite plan before editing.
- Prior to any feature or UI/UX change, consult Context7 MCP for the latest Next.js, Tailwind, Gemini, Supabase, or library docs and align the approach accordingly.
- Apply the CLAUDE risk checklist (UI, chat, database, API, workflows, dependencies) and iterate the plan until every item is satisfied.
- Implement in small increments; after coding, rerun lint/typecheck and replay impacted flows with Playwright MCP.

## MCP Tooling
- `Context7 MCP`: Required for documentation research, UI/UX validation, and verifying API usage before implementation.
- `Playwright MCP`: Run targeted journeys, accessibility shortcuts, and responsive checks after changes; capture evidence for reviewers when useful.
- `Supabase MCP`: Inspect schemas, validate policies, and confirm storage behaviour whenever persistence is involved.

## Commit & Pull Request Guidelines
- Mirror the local history with concise, imperative commits (`feat: add documents panel`, `Fix documents slider`) and keep changes atomic.
- PRs must summarize the work, list executed commands and manual scenarios, link issues/specs, and include screenshots or GIFs for UI updates.
- Confirm lint, typecheck, required MCP runs, and any targeted tests before requesting review.
