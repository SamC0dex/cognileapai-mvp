# CogniLeapAI MVP

🧠 **Transform PDFs into AI-powered study materials with intelligent chat and FREE semantic search**

A desktop-first web application that processes PDFs and generates comprehensive study materials including study guides, summaries, smart notes, and interactive flashcards. Features a complete chat system with streaming AI responses, enterprise-grade RAG with FREE semantic search, document context integration, and persistent conversation storage.

## ✨ Features

### 📄 Document Processing
- **PDF Upload & Processing** - Upload text-selectable PDFs with intelligent content extraction
- **Smart Outline Detection** - Automatically detects document structure and hierarchical sections
- **Enterprise RAG System** - FREE semantic search using Transformers.js (no API costs) + keyword hybrid search
- **Document Context Integration** - Chat responses use relevant document sections for accurate context

### 🤖 AI-Powered Study Tools
- **Study Guide Generation** - Multi-layered learning paths (Foundation → Connections → Applications → Mastery)
- **Smart Summary** - Significance hierarchy with strategic overview and practical implications
- **Smart Notes** - Active learning methodology with interconnected knowledge networks
- **Interactive Flashcards** - Tinder-style swipe animations, fullscreen mode, progress tracking, and study sessions

### 💬 Intelligent Chat System
- **Document-Specific Chat** - Chat with AI about specific documents with context awareness
- **Streaming Responses** - Real-time AI responses with smooth character-by-character display
- **Conversation Persistence** - Automatic saving to database with local caching
- **Keyboard Shortcuts** - Enter to send, Shift+Enter for newline, Cmd/Ctrl+K to focus

### 🎨 User Experience
- **Export Options** - Professional PDF and DOCX exports with styled formatting
- **Light/Dark Themes** - Clean, professional design system with teal/amber accents
- **Accessibility** - WCAG AA compliance, keyboard navigation, screen reader support
- **Responsive Design** - Optimized for desktop-first productivity workflows
- **Study Sessions** - Track progress, accuracy, and time spent on flashcards

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes with Server-Sent Events for streaming
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for PDF files with private access
- **AI**: Google Gemini 2.5 Pro/Flash/Lite via Vercel AI SDK
- **Semantic Search**: Transformers.js with mixedbread-ai/mxbai-embed-xsmall-v1 (FREE, no API costs)
- **State Management**: Zustand for chat, study tools, and flashcards state
- **Local Storage**: Dexie (IndexedDB) for chat history and offline capabilities
- **Export System**: html2pdf.js and @mohtasham/md-to-docx for PDF/DOCX generation
- **Package Manager**: pnpm 9.10.0

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CogniLeapAI-MVP
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file with the required environment variables:
   ```env
   # Required
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Run the development server**
   ```bash
   pnpm dev          # Standard development server
   pnpm dev:turbo    # Development server with Turbopack (faster)
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Environment Setup

### Prerequisites
- **Google Gemini API Key** - Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Supabase Project** - Create at [supabase.com](https://supabase.com)
  - Enable PostgreSQL database
  - Set up Storage bucket for PDF files
  - Configure Row Level Security (RLS)

### Required Environment Variables
- `GOOGLE_GENERATIVE_AI_API_KEY` - Your Google Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)

## 🏗️ Architecture

### Core Systems
- **Chat System** - Zustand store with custom hooks, streaming responses via Server-Sent Events
- **Study Tools** - AI-powered generation with persistent canvas, flashcard viewer, and export functionality
- **Enterprise RAG** - FREE semantic search with Transformers.js + intelligent chunking for large PDFs
- **AI Integration** - Auto-model selection (Gemini Flash Lite/Flash/Pro) based on query complexity
- **Flashcard System** - Interactive study sessions with progress tracking and animations

### Key Components
- **Frontend** - React components with TypeScript, optimized for desktop workflows
- **API** - RESTful endpoints + Server-Sent Events for real-time streaming
- **Database** - PostgreSQL with Row Level Security, hierarchical document sections
- **Storage** - Private Supabase Storage with signed URLs for PDF access
- **AI** - Google Gemini models via Vercel AI SDK with streaming support

### Development Commands
```bash
pnpm dev          # Start development server
pnpm dev:turbo    # Start with Turbopack (faster)
pnpm build        # Production build
pnpm build:analyze # Build with bundle analyzer
pnpm lint         # Run ESLint
pnpm typecheck    # TypeScript type checking
```

## 📖 Documentation

- [Development Guidelines](CLAUDE.md) - Comprehensive guide for working with this codebase
- [Project Documentation](docs/) - Additional technical documentation
  - Architecture patterns and workflow guidelines
  - Database schema and API contracts
  - Quality assurance and testing procedures

## 🔒 Security & Privacy

- **Private Storage** - All PDFs stored securely in private Supabase storage with signed URLs
- **API Security** - API keys never exposed to client-side code
- **Database Security** - Row Level Security (RLS) enabled on all database tables
- **Server-Only Operations** - Sensitive operations use Supabase service role
- **Input Validation** - Comprehensive sanitization on all API endpoints
- **No Data Logging** - User data never logged in telemetry

## 🎨 Design Philosophy

- **Desktop-First** - Optimized for productivity workflows and professional use
- **Calm Interface** - Clean design with subtle animations, no distracting elements
- **Accessibility** - WCAG AA compliance, full keyboard navigation, screen reader support
- **Performance** - Fast loading, efficient streaming, optimized for large documents
- **Professional** - Teal/amber accent colors, consistent design system

## 🚀 Key Features in Detail

### Smart Context Management
- **Hybrid Search** - Combines FREE semantic search (Transformers.js) with keyword matching
- **Intelligent Chunking** - Structure-aware document splitting with configurable overlap
- **Semantic Embeddings** - mixedbread-ai/mxbai-embed-xsmall-v1 model (22MB, 384 dimensions) - completely FREE
- **Performance Caching** - In-memory caching for embeddings (1 hour) and search results (30 minutes)
- **Token Management** - Automatically selects most relevant chunks within AI model limits

### Advanced Chat System
- **Optimistic Updates** - Immediate UI feedback with error rollback
- **Message Persistence** - Automatic saving to Supabase with local IndexedDB caching
- **Streaming Display** - Smooth character-by-character AI response rendering
- **Document Integration** - Chat responses include relevant document section citations

### Study Tools Generation
- **Multi-Modal AI** - Uses different Gemini models based on complexity and document size
- **Structured Output** - Hierarchical study guides, summaries, interconnected notes, and interactive flashcards
- **Export Options** - Professional PDF/DOCX generation with styled formatting, markdown export
- **Canvas Interface** - Full-screen content viewer with editing capabilities
- **Flashcard Features** - Tinder-style animations, progress tracking, study sessions, keyboard shortcuts

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ❤️ for students and researchers who want to transform their PDFs into powerful learning tools.


