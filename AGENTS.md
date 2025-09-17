# Repository Guidelines

## Project Structure & Key Files
- `src/app` holds App Router routes plus `src/app/api/**`; keep segments kebab-case with colocated loading/error UI.
- Reusable UI in `src/components` (PascalCase); chat and study logic in `src/lib/chat-store.ts`, `src/lib/smart-context.ts`, and `src/lib/study-tools-store.ts`.
- Shared hooks, types, and styles in `src/hooks`, `src/types`, and `src/styles`; assets in `public`; long-form docs in `docs/`.

## Tech Stack & Architecture
- Frontend: Next.js 15, TypeScript, Tailwind CSS, Radix UI, Framer Motion.
- Backend: Next.js API routes stream via Server-Sent Events through the Vercel AI SDK to Gemini models.
- Data: Supabase Postgres with Row Level Security, Supabase Storage, and Zustand plus Dexie for persistence.
- AI: Gemini Flash, Lite, and Pro with smart chunking and model selection defined in `src/lib`.

## UI/UX Guardrails
- Protect the desktop-first layout, teal and amber system, streaming chat feel, and shortcuts (Enter, Shift+Enter, Cmd/Ctrl+K).
- Stick to Tailwind utility patterns and Radix primitives; never regress accessibility, responsiveness, or loading states.
- Coordinate UI changes with design references and avoid bespoke CSS or heavy motion unless approved.

## Build, Test, and Development Commands
- `pnpm dev` or `pnpm dev:turbo` serves http://localhost:3000.
- `pnpm build && pnpm start` mimic production; `pnpm build:analyze` inspects bundles.
- `pnpm lint` plus `pnpm typecheck` enforce formatting and strict types.

## Coding Style & Naming
- Build functional React with strict TypeScript; memoize only when profiling proves value.
- Components stay PascalCase (`DocumentPanel.tsx`); utilities and hooks are camelCase (`useChatStore.ts`).
- Prefer Tailwind utilities and tidy class lists; linting controls formatting without a separate Prettier run.

## Testing & Validation
- Baseline: `pnpm lint && pnpm typecheck` with zero warnings.
- For `/api/chat/**` changes run `testDocumentChatEndpoint()` from `src/app/api/chat/document/test.ts`.
- Manually retest chat streaming, study tools, exports, and shortcuts; keep console and network clean.

## Workflow & Risk Controls
- Begin with deep analysis, list impacted files, and capture a TodoWrite plan.
- Apply the CLAUDE checklist across UI, chat, database, API, workflows, and dependencies.
- Deliver in tight increments, validating each step so no stale UI or UX ships.

## Commit & Pull Request Guidelines (Only When user asks)
- Use concise imperative commits (`feat: enhance study guide flow`, `fix: stabilize chat streaming guard`).
- PRs summarize scope, commands run, manual checks, linked specs or issues, and UI evidence.
- Confirm lint, typecheck, and relevant manual flows before requesting review.
