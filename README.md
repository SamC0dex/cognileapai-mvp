# CogniLeapAI MVP

**Transform PDFs into intelligent study materials with advanced AI-powered learning tools**

A comprehensive web application designed for students, researchers, and professionals who need to extract maximum value from their documents. CogniLeapAI processes PDFs and generates structured study materials including intelligent summaries, comprehensive notes, study guides, and interactive flashcards, all powered by advanced AI and enterprise-grade search capabilities.

## 🚀 Key Features

### Document Intelligence
- **Advanced PDF Processing** - Intelligent extraction from text-based PDFs with structure detection
- **Smart Outline Recognition** - Automatically identifies document hierarchy and section organization
- **Enterprise RAG System** - Production-ready retrieval augmented generation with hybrid search
- **Free Semantic Search** - Cost-effective semantic search using Transformers.js (no API dependencies)
- **Context-Aware Responses** - Document-specific interactions with relevant section citations

### AI-Powered Study Materials
- **Structured Study Guides** - Multi-level learning paths: Foundation → Connections → Applications → Mastery
- **Intelligent Summaries** - Hierarchical summaries with strategic insights and practical implications
- **Smart Notes** - Active learning methodology with interconnected knowledge mapping
- **Interactive Flashcards** - Advanced flashcard system with study sessions, progress tracking, and engaging animations
- **Export Capabilities** - Professional PDF and DOCX exports with custom formatting

### Advanced Chat System
- **Document-Contextual Chat** - Intelligent conversations grounded in document content
- **Real-Time Streaming** - Server-sent events with smooth, character-by-character response rendering
- **Conversation Persistence** - Automatic storage with both database and local caching
- **Optimistic UI Updates** - Immediate feedback with graceful error handling
- **Keyboard Shortcuts** - Productivity-focused shortcuts (Enter to send, Shift+Enter for newline, Cmd/Ctrl+K to focus)

### User Experience
- **Desktop-First Design** - Optimized for professional productivity workflows
- **Accessibility Compliance** - WCAG AA standards with full keyboard navigation and screen reader support
- **Dual Theme Support** - Professional light and dark themes with system preference detection
- **Responsive Interface** - Adaptive design with emphasis on desktop productivity
- **Performance Optimized** - Efficient rendering, lazy loading, and optimized bundle sizes

## 🛠️ Technology Stack

### Core Framework
- **Next.js 15** - App Router with TypeScript for type safety and modern development
- **React 19** - Latest React features with concurrent rendering
- **TypeScript** - Strict mode enabled for maximum type safety
- **Tailwind CSS** - Utility-first styling with custom design system

### Backend & Database
- **Next.js API Routes** - RESTful endpoints with Server-Sent Events for streaming
- **Supabase PostgreSQL** - Production database with Row Level Security
- **Supabase Storage** - Secure file storage with private access and signed URLs
- **Dexie (IndexedDB)** - Client-side storage for offline capabilities and caching

### AI & Machine Learning
- **Google Gemini AI** - Multiple models (Pro/Flash/Lite) with intelligent selection based on task complexity
- **Vercel AI SDK** - Streamlined AI integration with streaming support
- **Transformers.js** - Client-side machine learning for semantic embeddings
- **mixedbread-ai/mxbai-embed-xsmall-v1** - Efficient embedding model (22MB, 384 dimensions)

### State Management & Performance
- **Zustand** - Lightweight state management for chat, study tools, and flashcard systems
- **React Query** - Server state management with intelligent caching
- **Framer Motion** - Smooth animations and transitions
- **React Hook Form** - Performant form handling with validation

### UI Components & Styling
- **Radix UI** - Accessible, unstyled components as building blocks
- **Lucide React** - Consistent iconography
- **Sonner** - Toast notifications
- **next-themes** - Theme management with system preference detection

### Development & Build Tools
- **pnpm 9.10.0** - Fast, disk space efficient package manager
- **ESLint** - Code quality and style consistency
- **Bundle Analyzer** - Performance monitoring and optimization
- **cross-env** - Cross-platform environment variable handling

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **pnpm** 9.10.0 (recommended package manager)
- **Google Gemini API Key** - [Get your API key](https://makersuite.google.com/app/apikey)
- **Supabase Project** - [Create a project](https://supabase.com)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CogniLeapAI-MVP
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Environment Configuration**

   Create a `.env.local` file in the root directory:
   ```env
   # AI Configuration
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

   # Database Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Database Setup**
   - Create a new Supabase project
   - Run the provided migration scripts in `supabase/migrations/`
   - Configure Row Level Security policies
   - Set up storage bucket for PDF files

5. **Start Development Server**
   ```bash
   # Standard development server
   pnpm dev

   # Development server with Turbopack (faster builds)
   pnpm dev:turbo
   ```

6. **Access the Application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## 📋 Development Commands

```bash
# Development
pnpm dev                # Start development server
pnpm dev:turbo         # Start development server with Turbopack
pnpm build             # Build for production
pnpm build:analyze     # Build with bundle analyzer
pnpm start             # Start production server

# Quality Assurance
pnpm lint              # Run ESLint code quality checks
pnpm typecheck         # Run TypeScript type checking
```

## 🏗️ Architecture Overview

### Core Systems Architecture

#### Chat System
- **Centralized State** - Zustand store managing all chat operations and state
- **Streaming Integration** - Server-Sent Events for real-time AI response streaming
- **Context Management** - Intelligent document context retrieval and injection
- **Persistence Layer** - Dual storage with Supabase database and IndexedDB caching
- **Optimistic Updates** - Immediate UI feedback with error rollback mechanisms

#### Study Tools Generation
- **Multi-Modal AI Processing** - Dynamic model selection based on document complexity
- **Structured Output Generation** - Hierarchical content creation with consistent formatting
- **Interactive Components** - Flashcard viewer with study session tracking and animations
- **Export System** - Professional document generation (PDF/DOCX/Markdown)
- **Canvas Interface** - Full-screen content viewer with editing capabilities

#### Semantic Search System
- **Hybrid Retrieval** - Combines semantic search with traditional keyword matching
- **Free Embeddings** - Client-side embedding generation using Transformers.js
- **Intelligent Chunking** - Structure-aware document segmentation with overlap optimization
- **Performance Caching** - Multi-layer caching for embeddings and search results
- **Relevance Scoring** - Cosine similarity with keyword boost for optimal results

#### Data Architecture
- **Database Schema** - Normalized PostgreSQL schema with hierarchical document sections
- **Security Model** - Row Level Security with user-based access control
- **Storage Strategy** - Private file storage with secure, time-limited access URLs
- **Caching Strategy** - Multi-tier caching with browser storage and memory optimization

### Key Implementation Details

#### AI Model Selection Strategy
```typescript
// Intelligent model selection based on task complexity
- Gemini Flash Lite: Quick responses, simple queries (< 150ms)
- Gemini Flash: Balanced performance for study materials (~ 500ms)
- Gemini Pro: Complex analysis, large documents (> 1s response time)
```

#### Performance Optimizations
- **Component Memoization** - React.memo for expensive components
- **Lazy Loading** - Code splitting for study tools and flashcard components
- **Virtual Scrolling** - Efficient rendering for large document sections
- **Bundle Optimization** - Tree shaking and dynamic imports for reduced bundle size

#### Security Implementation
- **API Key Protection** - Server-side API key management, never exposed to client
- **Database Security** - Row Level Security policies enforced at database level
- **Input Validation** - Comprehensive sanitization on all user inputs
- **File Access Control** - Private storage with signed URLs and access controls

## 📖 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── api/                # API endpoints with streaming support
│   │   ├── chat/           # Chat system endpoints
│   │   ├── upload/         # Document upload processing
│   │   ├── extract-content/# Content extraction pipeline
│   │   └── study-tools/    # Study materials generation
│   ├── dashboard/          # Main application interface
│   └── chat/[id]/         # Individual conversation pages
│
├── components/             # React components
│   ├── chat/              # Chat system components
│   │   ├── chat-container.tsx    # Main chat interface
│   │   ├── chat-messages.tsx     # Message list with virtual scrolling
│   │   ├── chat-input.tsx        # Enhanced input with shortcuts
│   │   └── memoized-markdown.tsx # Optimized markdown rendering
│   ├── study-tools/       # Study tools components
│   │   ├── study-tools-panel.tsx  # Tool selection interface
│   │   ├── study-tools-canvas.tsx # Content viewer/editor
│   │   └── flashcard-viewer.tsx   # Interactive flashcard system
│   └── ui.tsx             # Comprehensive UI component library
│
├── lib/                    # Core utilities and configurations
│   ├── chat-store.ts      # Zustand chat state management
│   ├── study-tools-store.ts # Study tools state management
│   ├── smart-context.ts   # RAG system with semantic search
│   ├── embeddings.ts      # Free semantic embedding generation
│   ├── genai-client.ts    # Google Gemini AI client configuration
│   └── supabase.ts        # Database client configuration
│
├── contexts/               # React contexts
└── types/                  # TypeScript type definitions
```

## 🔒 Security & Privacy

### Data Protection
- **Private Storage** - All documents stored in private Supabase storage buckets
- **Access Control** - Time-limited signed URLs for secure file access
- **User Isolation** - Row Level Security ensures users only access their own data
- **No Data Logging** - User content never logged or stored in telemetry

### API Security
- **Server-Side Keys** - API keys never exposed to client-side code
- **Input Validation** - Comprehensive sanitization and validation on all endpoints
- **Rate Limiting** - Built-in protection against API abuse
- **HTTPS Enforcement** - Secure transmission of all data

### Compliance
- **GDPR Ready** - User data control and deletion capabilities
- **SOC 2 Compatible** - Following security best practices
- **Accessibility Standards** - WCAG AA compliance throughout the application

## 🎨 Design Philosophy

### User-Centered Design
- **Professional Interface** - Clean, distraction-free design for focused productivity
- **Accessibility First** - Comprehensive keyboard navigation and screen reader support
- **Performance Focused** - Fast loading times and smooth interactions
- **Desktop Optimized** - Layout and interactions designed for desktop productivity workflows

### Visual Design System
- **Consistent Typography** - Hierarchical text styles with optimal readability
- **Color Palette** - Professional teal and amber accents with neutral foundations
- **Spacing System** - Consistent spacing scale for visual harmony
- **Component Library** - Reusable components with consistent behavior and styling

## 🚀 Advanced Features

### Intelligent Context Management
```typescript
// Smart context retrieval for large documents
- Structure-aware chunking with configurable overlap
- Hybrid semantic and keyword search
- Performance caching for embeddings (1 hour TTL)
- Relevance scoring with cosine similarity + keyword matching
- Automatic fallback to keyword-only search if needed
```

### Study Session Tracking
```typescript
// Comprehensive flashcard study sessions
- Progress tracking with accuracy metrics
- Time-based performance analytics
- Spaced repetition algorithm support
- Custom study session configurations
- Export capabilities for study data
```

### Export System
```typescript
// Professional document generation
- PDF export with custom styling and branding
- DOCX export with proper formatting and structure
- Markdown export for universal compatibility
- Batch export capabilities for multiple materials
```

## 📊 Performance Metrics

### Bundle Optimization
- **Initial Bundle Size** - Optimized for fast loading
- **Code Splitting** - Dynamic imports for study tools and flashcard systems
- **Tree Shaking** - Elimination of unused code
- **Image Optimization** - Next.js automatic image optimization

### Runtime Performance
- **First Contentful Paint** - Optimized for quick initial render
- **Largest Contentful Paint** - Large content elements load efficiently
- **Cumulative Layout Shift** - Minimal layout shifts during loading
- **Time to Interactive** - Fast time to full interactivity

## 📄 License

MIT License - see [LICENSE](LICENSE) file for complete terms.

---

**CogniLeapAI MVP** - Empowering learners with intelligent document processing and AI-powered study tools for enhanced learning outcomes.