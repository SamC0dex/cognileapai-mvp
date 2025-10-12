# CogniLeapAI

**Modern learning platform that transforms documents into interactive study materials**

CogniLeapAI is a web application built for students, researchers, and professionals. Upload PDFs and generate comprehensive study materials including summaries, notes, study guides, and flashcards. Features an intelligent chat system for document Q&A, advanced token management for long conversations, and a professional interface designed for focused learning.

## Features

### Authentication & Security
- **Email/Password Authentication** - Secure user registration and login
- **Google OAuth Integration** - Quick sign-in with Google accounts
- **Password Recovery** - Self-service password reset flow
- **Row Level Security** - Database-level user data isolation
- **Protected Routes** - Middleware-based access control for authenticated pages
- **Session Persistence** - Automatic session refresh and state management

### Document Processing
- **PDF Upload & Parsing** - Extract text and structure from PDF documents
- **Section Detection** - Automatic identification of document hierarchy and organization
- **Document Management** - Upload, organize, and delete documents with isolated user storage
- **Content Extraction Pipeline** - Asynchronous processing with status tracking
- **Secure File Storage** - Private Supabase storage with time-limited access URLs

### Intelligent Chat System
- **Contextual Conversations** - Chat with documents using relevant sections as context
- **Streaming Responses** - Real-time AI responses with smooth character-by-character display
- **Conversation History** - Persistent chat sessions with database and local storage backup
- **Token Management** - Smart tracking of conversation length with context window monitoring
- **Context Optimization** - Automatic conversation summarization to maintain quality in long chats
- **Multi-Document Support** - Select and chat with multiple documents simultaneously
- **Model Selection** - Choose between Gemini models based on response speed vs quality needs
- **Keyboard Shortcuts** - Efficient navigation (Enter to send, Shift+Enter for newline, Cmd/Ctrl+K to focus)

### Study Tools Generation
- **Study Guides** - Structured learning paths with foundation, connections, applications, and mastery sections
- **Smart Summaries** - Hierarchical overviews with key insights and strategic implications
- **Smart Notes** - Active learning notes with interconnected concepts and knowledge networks
- **Interactive Flashcards** - Q&A cards with swipe animations, study sessions, and progress tracking
- **Conversation-Based Generation** - Create study materials from chat conversations, not just documents
- **Concurrent Generation** - Generate multiple study tools simultaneously without blocking
- **Export Options** - Download as PDF, DOCX, or copy to clipboard

### Token & Context Management
- **Real-Time Token Tracking** - Monitor conversation token usage with visual indicators
- **Context Window Warnings** - Progressive alerts (caution → warning → critical) as conversation grows
- **Smart Optimization** - Automatic conversation summarization retaining recent context
- **Document Context Sizing** - Dynamic adjustment of document context based on conversation length
- **Quality Preservation** - Maintain AI response quality through intelligent context management
- **Multi-Level Indicators** - Visual feedback (green → yellow → red) for context usage

### Semantic Search
- **Free Embeddings** - Client-side semantic search using Transformers.js (no API costs)
- **Hybrid Search** - Combines semantic similarity with keyword matching for optimal results
- **Intelligent Chunking** - Structure-aware document segmentation with configurable overlap
- **Relevance Scoring** - Cosine similarity calculations for accurate context retrieval
- **Performance Caching** - Multi-layer caching for embeddings and search results

### User Interface
- **Modern Design** - Clean, professional interface with teal/amber color scheme
- **Dark/Light Themes** - System-aware theme switching with persistent preferences
- **Responsive Layout** - Desktop-first design that adapts to different screen sizes
- **Accessibility** - WCAG AA compliance with keyboard navigation and screen reader support
- **Loading States** - Smooth transitions and skeleton loaders for async operations
- **Toast Notifications** - Non-intrusive feedback for user actions

## Technology Stack

### Frontend
- **Next.js 15.5** - React framework with App Router for server-side rendering and API routes
- **React 19** - UI library with latest concurrent features
- **TypeScript 5.6** - Static type checking for reliability and developer experience
- **Tailwind CSS 3.4** - Utility-first CSS framework with custom design system
- **Framer Motion** - Animation library for smooth transitions and interactive elements

### Backend & Database
- **Supabase PostgreSQL** - Database with Row Level Security for user data isolation
- **Supabase Auth** - Authentication service supporting email/password and OAuth providers
- **Supabase Storage** - Secure file storage with private buckets and signed URLs
- **@supabase/ssr** - Server-side Supabase client for Next.js integration
- **Next.js API Routes** - RESTful endpoints with Server-Sent Events for response streaming

### AI & Embeddings
- **Google Gemini** - Large language models (2.5 Pro, Flash, Lite) via @google/genai SDK
- **Transformers.js** - In-browser ML library for client-side semantic embeddings
- **mixedbread-ai/mxbai-embed-xsmall-v1** - Lightweight embedding model (384 dimensions, 22MB)
- **Smart Context System** - Custom RAG implementation with hybrid search and relevance scoring

### State Management
- **Zustand 5.0** - Lightweight state management with middleware support
- **Dexie 4.2** - IndexedDB wrapper for client-side chat history and offline support
- **React Hook Form** - Form state management with validation
- **Zustand Persist** - Automatic state persistence to localStorage

### UI Components
- **Radix UI** - Headless, accessible component primitives (Dialog, Dropdown, Tabs, etc.)
- **Lucide React** - Icon library with 1000+ consistent icons
- **React Markdown** - Markdown rendering with GitHub-flavored markdown support
- **Sonner** - Toast notification system
- **next-themes** - Dark/light theme management with system detection

### PDF Processing
- **pdfjs-dist** - PDF.js for browser-based PDF parsing and text extraction
- **pdf-parse** - Server-side PDF content extraction
- **html2pdf.js** - Client-side PDF generation from HTML
- **@mohtasham/md-to-docx** - Markdown to DOCX conversion for exports

### Development Tools
- **pnpm 9.10** - Fast, disk-efficient package manager
- **ESLint** - Code linting with Next.js configuration
- **TypeScript Compiler** - Type checking (pnpm typecheck)
- **@next/bundle-analyzer** - Bundle size analysis and optimization
- **cross-env** - Cross-platform environment variables

## Getting Started

### Prerequisites
- Node.js 18 or higher
- pnpm 9.10 (package manager)
- Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))
- Supabase account ([create free account](https://supabase.com))

### Installation

1. Clone the repository and install dependencies:
   ```bash
   git clone <repository-url>
   cd cognileapai-mvp
   pnpm install
   ```

2. Create `.env.local` in the project root:
   ```env
   # Google Gemini API
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Set up Supabase:
   - Create a new project in Supabase dashboard
   - Run migrations from `supabase/migrations/` directory
   - Configure Row Level Security policies (automatic with migrations)
   - Create a private storage bucket named `documents`
   - Enable email authentication in Authentication > Providers
   - (Optional) Configure Google OAuth with your credentials

4. Start the development server:
   ```bash
   pnpm dev
   # or for faster builds with Turbopack
   pnpm dev:turbo
   ```

5. Open [http://localhost:3000](http://localhost:3000) and create an account

## Development Commands

```bash
# Development
pnpm dev              # Start development server (http://localhost:3000)
pnpm dev:turbo        # Start with Turbopack (faster HMR)
pnpm build            # Production build
pnpm build:analyze    # Build with bundle size analysis
pnpm start            # Start production server

# Code Quality
pnpm lint             # Run ESLint
pnpm typecheck        # TypeScript type checking (no emit)
```

## Architecture

### Project Structure
```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API endpoints
│   │   ├── chat/            # Chat system endpoints
│   │   ├── documents/       # Document management
│   │   ├── extract-content/ # PDF processing
│   │   ├── study-tools/     # Study tools generation
│   │   └── upload/          # File upload handler
│   ├── auth/                 # Authentication pages
│   ├── dashboard/            # Main app interface
│   └── page.tsx              # Landing page
│
├── components/               # React components
│   ├── chat/                # Chat system components
│   ├── study-tools/         # Study tools components
│   ├── landing/             # Landing page sections
│   ├── error-management/    # Error handling UI
│   └── ui.tsx               # Shared UI components
│
├── lib/                      # Core utilities
│   ├── supabase/            # Supabase clients (client, server, middleware)
│   ├── chat-store.ts        # Chat state management
│   ├── study-tools-store.ts # Study tools state
│   ├── flashcard-store.ts   # Flashcard state
│   ├── token-manager.ts     # Token tracking & optimization
│   ├── smart-context.ts     # RAG and semantic search
│   ├── embeddings.ts        # Client-side embeddings
│   ├── genai-client.ts      # Gemini API integration
│   └── errors/              # Error handling system
│
├── contexts/                 # React contexts
├── hooks/                    # Custom hooks
├── types/                    # TypeScript definitions
└── middleware.ts             # Authentication middleware
```

### Key Systems

#### Token Management System
**File**: `src/lib/token-manager.ts`

Intelligent conversation length tracking with progressive warnings:
- Real-time token estimation (character + word-based algorithms)
- Context window monitoring (200K practical limit, 1M+ technical limit)
- Progressive warning levels: Caution (150K) → Warning (180K) → Critical (200K)
- Automatic conversation optimization with summarization
- Dynamic document context sizing based on conversation length

#### Smart Context System  
**File**: `src/lib/smart-context.ts`

RAG implementation with free semantic search:
- Hybrid search (semantic + keyword matching)
- Client-side embeddings via Transformers.js (no API costs)
- Structure-aware document chunking with configurable overlap
- Cosine similarity for relevance scoring
- Multi-layer caching for performance (embeddings + search results)

#### Chat System
**Files**: `src/lib/chat-store.ts`, `src/lib/use-chat.ts`

State management with Zustand:
- Server-Sent Events for response streaming
- Dual persistence (Supabase + IndexedDB)
- Optimistic UI updates with rollback
- Conversation optimization for long chats
- Multi-document context support

#### Study Tools System
**File**: `src/lib/study-tools-store.ts` (2800+ lines)

Advanced generation system:
- Concurrent generation support (multiple tools simultaneously)
- Progress tracking with realistic simulation
- Conversation-based generation (not just documents)
- Auto-open queue system for sequential viewing
- Flashcard integration with dedicated store
- Export system (PDF/DOCX/clipboard)

#### Error Management
**Files**: `src/lib/errors/translator.ts`, `src/lib/errors/logger.ts`

Comprehensive error handling:
- User-friendly error translation
- Structured error logging
- Retry logic with exponential backoff
- Context-aware error messages

### Security

- **Row Level Security** - Database policies enforce user data isolation
- **Protected Routes** - Middleware checks authentication before page access
- **Secure File Storage** - Private buckets with time-limited signed URLs
- **Server-Side API Keys** - Gemini API key never exposed to client
- **Input Sanitization** - All user inputs validated and sanitized
- **OAuth Security** - PKCE flow for Google authentication

### Performance

- **Code Splitting** - Dynamic imports for study tools and flashcards
- **Component Memoization** - React.memo for expensive renders
- **State Persistence** - localStorage for offline access
- **Efficient Streaming** - Smooth SSE with character-by-character display
- **Bundle Optimization** - Tree shaking and optimized imports
- **Caching** - Multi-layer caching for embeddings, search, and API responses

## Database Schema

Core tables in Supabase PostgreSQL:
- **users** - User accounts and authentication
- **documents** - PDF metadata and file storage references
- **sections** - Hierarchical document sections with parent-child relationships
- **conversations** - Chat session metadata
- **messages** - Chat messages with role, content, and token counts
- **outputs** - Generated study materials (guides, summaries, notes) stored as JSONB
- **chat_sessions** - Stateful sessions for persistent conversation memory

All tables protected by Row Level Security policies ensuring complete user data isolation.

## Contributing

This is a personal project and not currently accepting external contributions. Feel free to fork for your own use.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with Next.js, TypeScript, Supabase, and Google Gemini