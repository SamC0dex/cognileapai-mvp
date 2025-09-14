# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CogniLeapAI MVP is a desktop-first web application that processes PDFs and generates AI-powered study materials (summaries, notes, and study guides) using Google Gemini models. The app features a complete chat system with streaming AI responses, document context integration, and persistent conversation storage.

## Must Follow Workflow

**CRITICAL**: This workflow MUST be followed for every implementation request to ensure quality, stability, and preservation of existing functionality.

### Primary Directive
**NEVER break existing UI/UX, features, or functionalities at any cost.** Preserving what we have built is worth infinitely more than adding new features. Every change must be thoroughly validated to ensure zero regression.

### Development Server Management
- **ALWAYS use existing server ports** that are already running
- **NEVER initialize new servers** unnecessarily
- Check if development servers are already running using:
  ```bash
  # Check for running processes on common ports
  netstat -tulpn | grep :3000  # or equivalent for your OS
  ```
- If servers are running, connect to existing instances
- Only start new servers if absolutely necessary and no conflicts exist

### Mandatory Implementation Workflow

#### Phase 1: Ultra-Deep Analysis
1. **Ultrathink** - Spend significant time understanding:
   - Exact user requirement and context
   - Current codebase architecture and patterns
   - Potential impact areas and dependencies
   - Risk assessment for existing functionality

2. **Comprehensive Research** - Before any implementation:
   - Use MCP tools to explore relevant codebase sections, 
   - You must use context7 MCP for understanding latest information/docs on used libraries/frameworks, or to update/change or add anything.
   - Understand existing patterns and conventions
   - Identify all files that might be affected

3. **Context Gathering** - Ask clarifying questions when needed:
   - Request visual references for UI/UX changes
   - Clarify specific requirements and expectations
   - Ask about preferred approaches or constraints
   - Seek examples or inspirations if helpful

#### Phase 2: Strategic Planning
1. **Draft Comprehensive Plan** using TodoWrite tool:
   - Break down into detailed, specific steps
   - Include all affected files and components
   - Consider edge cases and error handling
   - Plan testing and validation steps

2. **Triple Verification Process**:
   - **Review 1**: Check plan for potential bugs or errors
   - **Review 2**: Verify no existing functionality will break
   - **Review 3**: Ensure plan follows project conventions
   - If ANY issues found, reiterate with different approach
   - Continue until 100% confident in plan safety

3. **Risk Assessment Checklist**:
   - [ ] Will this break any existing UI components?
   - [ ] Will this affect chat system functionality?
   - [ ] Will this impact database operations?
   - [ ] Will this change API behavior?
   - [ ] Will this affect user workflows?
   - [ ] Are all dependencies properly handled?

#### Phase 3: Implementation
1. **Follow Established Patterns**:
   - Use existing component structures and conventions
   - Follow TypeScript strict mode requirements
   - Maintain consistent code style and patterns
   - Leverage existing utilities and libraries

2. **Incremental Development**:
   - Implement in small, testable increments
   - Test each change before proceeding
   - Use TodoWrite to track progress accurately
   - Commit logical, atomic changes

#### Phase 4: Mandatory Quality Assurance

**CRITICAL**: After EVERY implementation, perform comprehensive testing using MCP tools:

1. **UI/UX Validation using Playwright MCP**:
   - Navigate to affected pages/components
   - Test all interactive elements (buttons, inputs, forms)
   - Verify responsive design and accessibility
   - Test keyboard navigation and shortcuts
   - Simulate real user workflows and interactions
   - Example testing scenarios:
     ```javascript
     // Test chat functionality after optimization
     await browser.navigate('http://localhost:3000/dashboard')
     await browser.type('.chat-input', 'Sample test message')
     await browser.pressKey('Enter')
     await browser.waitFor(5000) // Wait for AI response
     // Verify response appears correctly
     ```

2. **Error Detection using BrowserTools MCP**:
   - Check console for JavaScript errors
   - Monitor network requests for failures
   - Verify no broken functionality
   - Check for accessibility violations
   - Monitor performance metrics

3. **Functional Testing Requirements**:
   - Test the specific feature/improvement implemented
   - Verify all existing features still work perfectly
   - Test edge cases and error scenarios
   - Ensure proper loading states and error handling

### MCP Tools Usage Guidelines

**Always leverage MCP tools efficiently**:

- **Supabase MCP**: Database operations, schema validation, query testing
- **Playwright MCP**: UI automation, user flow testing, cross-browser validation
- **BrowserTools MCP**: Error monitoring, performance analysis, accessibility audits
- **Context7 MCP**: Documentation lookup for libraries and frameworks
- **Filesystem MCP**: File operations, directory structure management

### Quality Gates

**Before marking any implementation complete**:

1. ✅ All existing functionality verified working
2. ✅ No console errors or warnings
3. ✅ New feature/improvement works perfectly
4. ✅ UI/UX remains consistent and professional
5. ✅ Performance not degraded
6. ✅ Accessibility maintained
7. ✅ TypeScript compilation successful
8. ✅ ESLint passes without errors

### Communication Protocol

- **Ask questions freely** - Better to over-clarify than assume
- **Request visual references** for UI/UX work when needed
- **Seek specific requirements** rather than making assumptions
- **Provide status updates** using TodoWrite for transparency
- **Report any issues immediately** if discovered during testing

### Emergency Protocols

If implementation breaks existing functionality:
1. **STOP immediately** - Do not proceed further
2. **Document the issue** clearly and specifically
3. **Revert problematic changes** if possible
4. **Analyze root cause** before attempting alternative approach
5. **Get user confirmation** before trying different implementation

This workflow ensures every change enhances the application while maintaining the stability and quality of existing features.

## Common Commands

### Development
```bash
pnpm dev          # Start development server on http://localhost:3000
pnpm dev:turbo    # Start development server with Turbopack (faster)
pnpm build        # Build for production
pnpm build:analyze # Build with bundle analyzer
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript type checking
```

### Package Management
Uses pnpm (version 9.10.0) - always use `pnpm` instead of `npm` or `yarn`.

## Architecture

### Tech Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes with Server-Sent Events for streaming
- **Database**: Supabase PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for PDF files
- **AI**: Google Gemini 2.5 Pro/Flash/Lite via Vercel AI SDK
- **State Management**: Zustand for chat state management
- **Local Storage**: Dexie (IndexedDB) for chat history

### Core Architecture Patterns

#### Chat System Architecture
- **Zustand Store** (`lib/chat-store.ts`) - Centralized state management for all chat operations
- **Custom Hook** (`lib/use-chat.ts`) - Simplified API for components to interact with chat
- **Server-Sent Events** - Real-time streaming AI responses via `/api/chat` endpoints
- **Optimistic Updates** - Immediate UI feedback with error rollback
- **Document Context Integration** - Chat responses use document sections for context

#### AI Model Selection Strategy
- **Gemini Flash Lite**: Quick interactions, simple queries (< 150ms response)
- **Gemini Flash**: Balanced performance for most study materials (~ 500ms)
- **Gemini Pro**: Complex analysis, long documents (> 1s response)
- **Auto-selection**: Based on message context, document size, and request type

#### API Architecture (Implemented)
- `/api/chat` - General AI chat with conversation persistence
- `/api/chat/document` - Document-specific chat with section context
- `/api/upload` - PDF upload and processing pipeline
- All endpoints use Server-Sent Events for streaming responses
- Database operations use server-only Supabase service role

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # Implemented API routes
│   │   ├── chat/         # Chat endpoints with streaming
│   │   └── upload/       # PDF upload processing
│   ├── chat/[id]/        # Individual chat conversations
│   ├── dashboard/        # Main dashboard page
│   └── test-document-chat/ # Chat testing page
├── components/
│   ├── chat/             # Complete chat system components
│   │   ├── chat-container.tsx     # Main chat interface
│   │   ├── chat-input.tsx         # Enhanced input with shortcuts
│   │   ├── chat-messages.tsx      # Message list with scrolling
│   │   ├── chat-message.tsx       # Individual message display
│   │   ├── memoized-markdown.tsx  # Optimized markdown rendering
│   │   └── types.ts              # Chat type definitions
│   └── ui.tsx           # Comprehensive UI component library
├── lib/
│   ├── chat-store.ts    # Zustand chat state management
│   ├── use-chat.ts      # Custom hook for chat operations
│   ├── ai-config.ts     # AI model configuration and selection
│   ├── chat-history.ts  # Local storage for chat persistence
│   └── supabase.ts      # Supabase client configuration
└── hooks/               # Custom React hooks
```

### Database Schema
Core entities in Supabase:
- `documents` - PDF metadata and storage paths
- `sections` - Document sections with hierarchical structure  
- `conversations` - Chat conversation metadata
- `messages` - Individual chat messages with role, content, metadata
- `outputs` - Generated study materials (summary/notes/study_guide) as JSONB

See `supabase/schema.sql` for complete schema and `docs/DATABASE_SCHEMA.md` for details.

### Chat System Integration

#### Key Components
- **ChatContainer** - Main chat interface with document context
- **useChat Hook** - Simplified API: `sendMessage()`, `clearChat()`, `regenerateLastMessage()`
- **AI Streaming** - Real-time response streaming with smooth character-by-character display
- **Keyboard Shortcuts** - Enter to send, Shift+Enter for newline, Cmd/Ctrl+K to focus
- **Message Persistence** - Automatic saving to Supabase with local caching

#### Usage Pattern
```tsx
// Simple integration
<ChatContainer documentId="doc_123" />

// With custom hook
const { messages, sendMessage, isStreaming } = useChat(documentId)
```

### AI Integration
- **Model Selection**: Automatic based on context (see `ai-config.ts`)
- **Streaming Responses**: Server-Sent Events with smooth UI updates
- **Document Context**: Relevant sections passed to AI for accurate responses
- **Citation Support**: AI responses include document references
- **Error Recovery**: Graceful handling of API failures with retry mechanisms

### Design System
- **Custom Tailwind Configuration** with design tokens
- **Component Library** in `components/ui.tsx` with consistent patterns
- **Dark/Light Theme** via `next-themes` with system preference detection
- **Accessibility**: WCAG AA compliance, keyboard navigation, screen reader support
- **Professional UI**: Clean, calm interface with teal/amber accent colors

### Environment Requirements
```env
# Required
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url  
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Security Implementation
- **Row Level Security** enabled on all database tables
- **Private Storage Bucket** for PDF files with signed URLs
- **API Keys** never exposed to client-side code
- **Server-only Operations** using Supabase service role for sensitive operations
- **Input Validation** and sanitization on all API endpoints

## Development Guidelines

### Working with Chat System
- **Always use the useChat hook** for chat operations rather than direct store access
- **Handle loading states** properly - chat operations are async
- **Test streaming behavior** - ensure UI handles partial responses correctly
- **Document context is crucial** - most chat functionality expects a documentId

### Code Quality Standards  
- **TypeScript strict mode** - no `any` types, proper interface definitions
- **ESLint configuration** - follows Next.js recommended rules
- **Component patterns** - use React.memo for performance, proper prop typing
- **Error boundaries** - wrap chat components in error boundaries for graceful failures

### Performance Considerations
- **Memoized components** - Chat messages are memoized to prevent unnecessary re-renders
- **Optimistic updates** - UI responds immediately, syncs with server asynchronously  
- **Smooth streaming** - Character-by-character display for natural chat experience
- **Efficient scrolling** - Smart auto-scroll with user interaction detection

## Key Files
- `src/lib/chat-store.ts` - Central chat state management
- `src/components/chat/README.md` - Comprehensive chat system documentation
- `package.json` - Dependencies and development scripts
- `tailwind.config.ts` - Design system configuration  
- `docs/` - Detailed project documentation