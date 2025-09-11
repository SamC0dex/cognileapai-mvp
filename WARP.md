# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CogniLeap AI MVP is a Next.js 14 desktop-first web application that transforms PDFs into AI-powered study materials. It uses a hybrid heuristic approach for outline detection and streams AI-generated content using Google Gemini models.

## Development Commands

### Core Development
- **Start dev server**: `pnpm dev`
- **Build for production**: `pnpm build`
- **Type checking**: `pnpm typecheck`
- **Lint code**: `pnpm lint`
- **Start production server**: `pnpm start`

### Package Management
- **Install dependencies**: `pnpm install`
- **Add package**: `pnpm add <package>`
- **Add dev dependency**: `pnpm add -D <package>`

## Architecture Overview

### High-Level Structure
- **Frontend**: Next.js 14 App Router with TypeScript, Server-Sent Events for streaming
- **Styling**: Tailwind CSS with custom design system (teal/amber accents, calm motion)
- **Database**: Supabase PostgreSQL with Row Level Security (service role only)
- **Storage**: Supabase Storage for PDF files (private bucket)
- **AI**: Google Gemini 2.5 Pro/Flash models via Vercel AI SDK
- **Components**: Radix UI primitives with custom styling

### Key Directories
- `src/app/`: Next.js App Router pages and API routes
- `src/components/`: Reusable React components
- `src/lib/`: Shared utilities and configurations
- `docs/`: Comprehensive project documentation
- `supabase/`: Database schema and policies

### Data Flow
1. **Upload Phase**: PDF → Supabase Storage → Text extraction → Document + Sections creation
2. **Processing Phase**: Hybrid outline detection → Section hierarchy creation
3. **Generation Phase**: Per-section AI generation (SSE streaming) → Structured outputs storage
4. **Export Phase**: Deterministic Markdown generation matching UI exactly

### Database Schema
- `documents`: Core document metadata and storage paths
- `sections`: Hierarchical document sections with page ranges
- `outputs`: Generated content (summary, notes, study_guide) per section and overall
- Storage bucket `documents`: Private PDF file storage

## Development Workflow

### Phase-Based Development
The project follows a structured 8-phase implementation plan (see `docs/MASTER_PLAN.md`):
1. **System Prep**: Environment setup
2. **Scaffold & Tokens**: Next.js + design system  
3. **Supabase & Data Model**: Database setup
4. **Upload & Text Extraction**: PDF processing
5. **Outline Detection**: Hybrid heuristic algorithm
6. **Generation & Streaming**: AI content generation with SSE
7. **Export**: Deterministic Markdown export
8. **Polish & QA**: Accessibility and performance

### Branch Strategy
- Feature branches: `feature/phase-<n>-<name>`
- Use conventional commits: `feat:`, `fix:`, `chore:`, etc.
- Squash merge after PR review

## Key Implementation Details

### Design System Principles
- **Calm UI**: No gradients, subtle motion, professional appearance
- **Color Palette**: Teal (primary), Amber (secondary), with WCAG AA compliance
- **Motion**: Respects `prefers-reduced-motion`, 0.16-0.18s transitions
- **Typography**: Inter font with system UI fallback

### AI Integration
- **Model Selection**: Gemini 2.5 Pro for heavy/long content, 2.5 Flash for typical sections
- **Streaming**: Server-Sent Events with zod schema validation
- **Error Handling**: One repair pass on validation failure
- **Content Types**: Summary (bullet points), Notes (hierarchical), Study Guide (concepts/checks/pitfalls)

### Security & Privacy
- Environment variables in `.env.local` (never committed)
- Server-only database access via service role key
- Private storage bucket with service role access only
- Row Level Security enabled (service role bypass)

## Environment Setup

Required environment variables (copy from `.env.example` to `.env.local`):
```
GOOGLE_AI_API_KEY=
GEMINI_HEAVY_MODEL=gemini-2.5-pro
GEMINI_FAST_MODEL=gemini-2.5-flash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
SUPABASE_BUCKET_DOCUMENTS=documents
```

## MCP Integration

When implementing features, use MCP to fetch up-to-date documentation:

### Libraries to Query
- **TailwindCSS**: Utility classes and configuration
- **Radix UI**: Component primitive props and accessibility patterns  
- **Supabase JS**: Storage operations and service role client usage
- **Google Generative AI Node SDK**: Gemini 2.5 streaming and JSON techniques
- **Vercel AI SDK**: Streaming implementation patterns

### MCP Prompt Pattern
"Search the latest docs for [topic]. Summarize the precise code usage and constraints. Return citations."

## Testing Strategy

### Verification Per Phase
- **Phase 1**: UI loads, theme toggle works, skeletons animate, contrast meets AA
- **Phase 2**: Database connection established, RLS blocks anonymous access, service role succeeds  
- **Phase 3**: Upload 100-page PDF successfully, document appears in UI, blob exists in storage
- **Phase 4**: Outline coverage ≥95%, section lengths 300-3000 chars, manual sanity check passes
- **Phase 5**: Streaming starts <1s, schemas validate, 5 random sections pass checks
- **Phase 6**: Markdown export matches UI exactly, headings and order consistent

### Manual QA
Follow `docs/QA_CHECKLIST.md` for comprehensive testing coverage.

## File Organization Patterns

### API Routes (`src/app/api/`)
- **Node runtime**: Required for PDF parsing (not Edge)
- **Error handling**: Typed JSON responses with error codes
- **Streaming**: text/event-stream for real-time generation
- **Export**: text/markdown for deterministic output

### Component Structure
- **UI Components**: Radix primitives with custom variants
- **Business Logic**: Separation between presentation and data fetching
- **Accessibility**: Keyboard navigation, ARIA labels, focus management

## Performance Considerations

- **PDF Limits**: 20MB max file size, 200 pages maximum
- **Text Processing**: Hybrid heuristic approach for reliability over pure AI
- **Streaming**: Immediate feedback for long-running AI operations
- **Caching**: Leverage Next.js and React Query for data management

## Debugging and Development Tips

### Common Issues
- **Environment Variables**: Ensure `.env.local` exists and contains all required values
- **Database Access**: Confirm Supabase service role key has proper permissions
- **PDF Processing**: Text-selectable PDFs required (no OCR in MVP)
- **Streaming Errors**: Check zod schema validation and repair pass logic

### Development Tools
- Use browser DevTools for SSE debugging
- Supabase dashboard for database inspection
- Console logs for outline detection debugging (dev panel)

## Documentation References

Core documentation in `docs/` directory:
- `MASTER_PLAN.md`: Complete implementation roadmap
- `API_CONTRACTS.md`: Detailed API specifications
- `UI_DESIGN_SYSTEM.md`: Design tokens and component guidelines
- `DATABASE_SCHEMA.md`: Database structure and relationships
- `SECURITY_PRIVACY.md`: Security implementation details
