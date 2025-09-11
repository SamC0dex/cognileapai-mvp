# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CogniLeapAI MVP is a desktop-first web application that processes PDFs and generates AI-powered study materials (summaries, notes, and study guides) using Google Gemini models. The app is built with Next.js 14 and uses Supabase for database and file storage.

## Common Commands

### Development
```bash
pnpm dev          # Start development server on http://localhost:3000
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
```

### Package Management
Uses pnpm (version 9.10.0) - always use `pnpm` instead of `npm` or `yarn`.

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes with Server-Sent Events for streaming
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for PDF files
- **AI**: Google Gemini 2.5 Pro/Flash via Vercel AI SDK

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (not yet implemented)
│   ├── dashboard/         # Main dashboard page
│   ├── doc/[id]/         # Document detail pages
│   ├── layout.tsx        # Root layout with theme provider
│   └── page.tsx          # Root page (redirects to dashboard)
├── components/           # React components
│   ├── ui.tsx           # UI component library (currently empty)
│   ├── header.tsx       # Main navigation header
│   ├── theme-provider.tsx # Dark/light theme provider
│   └── [other-components]
├── lib/
│   └── utils.ts         # Utility functions (cn helper)
└── styles/
    └── globals.css      # Global styles
```

### Database Schema
Three core entities in Supabase:
- `documents` - PDF metadata and storage paths
- `sections` - Document sections with hierarchical structure
- `outputs` - Generated content (summary/notes/study_guide) stored as JSONB

See `supabase/schema.sql` for complete schema and `docs/DATABASE_SCHEMA.md` for details.

### API Architecture (Planned)
- `/api/upload` - PDF upload and processing
- `/api/docs/[id]` - Document and sections retrieval  
- `/api/generate/[id]` - AI content generation with SSE streaming
- `/api/export/[id]` - Markdown export
- All endpoints use server-only Supabase service role for database access

### AI Integration
- Uses Google Gemini models via Vercel AI SDK
- Model selection: Gemini 2.5 Pro for complex/long content, Gemini 2.5 Flash for typical sections
- Content generation supports streaming via Server-Sent Events
- Structured outputs using Zod schemas

### Design System
- Custom Tailwind config with design tokens for colors, shadows, animations
- Desktop-first responsive design
- Dark/light theme support via `next-themes`
- Accessibility-focused with WCAG AA compliance
- Professional, calm UI with teal/amber accent colors

### Environment Requirements
- Google Gemini API key
- Supabase project URL and service role key
- Node.js runtime (not Edge) required for PDF parsing

### Security
- Row Level Security enabled on all database tables
- Private Supabase storage bucket for PDFs
- API keys never exposed to client
- Server-only database access using service role key

## Key Files
- `package.json` - Dependencies and scripts
- `next.config.js` - Next.js configuration with webpack customizations
- `tailwind.config.ts` - Custom design system configuration
- `supabase/schema.sql` - Database schema
- `docs/` - Comprehensive project documentation