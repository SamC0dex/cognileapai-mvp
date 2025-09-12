# Complete Chat System Documentation

## Overview

The complete chat system is now fully integrated with Zustand state management, providing a robust, feature-rich chat experience with document context, streaming messages, keyboard shortcuts, and persistent storage.

## Architecture

```
📁 chat/
├── chat-container.tsx      # Main chat component with store integration
├── chat-input.tsx         # Enhanced input with keyboard shortcuts
├── chat-message.tsx       # Individual message display
├── streaming-indicator.tsx # Loading/typing indicators
├── types.ts              # TypeScript type definitions
├── chat-example.tsx      # Usage examples
└── index.ts             # Barrel exports

📁 lib/
├── chat-store.ts         # Zustand store for chat state
├── use-chat.ts          # Custom hook for simplified chat API
└── ai-config.ts         # AI model configuration
```

## Quick Start

### Basic Usage

```tsx
import { ChatContainer } from '@/components/chat'

// Minimal integration - just pass a document ID
function MyApp() {
  return (
    <div className="h-screen">
      <ChatContainer documentId="doc_123" />
    </div>
  )
}
```

### Advanced Usage with Custom Hook

```tsx
import { useChat } from '@/lib/use-chat'
import { ChatContainer } from '@/components/chat'

function AdvancedChatApp({ documentId }: { documentId: string }) {
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearChat,
    hasMessages
  } = useChat(documentId)

  return (
    <div className="h-screen flex flex-col">
      {/* Custom header */}
      <div className="p-4 border-b">
        <h1>Chat ({messages.length} messages)</h1>
        {hasMessages && (
          <button onClick={clearChat}>Clear Chat</button>
        )}
      </div>

      {/* Chat container handles everything else */}
      <div className="flex-1">
        <ChatContainer documentId={documentId} />
      </div>
    </div>
  )
}
```

## Features

### ✅ State Management
- **Zustand Store**: Centralized state management
- **Persistent Storage**: Messages saved to Supabase
- **Optimistic Updates**: Immediate UI feedback
- **Error Recovery**: Graceful error handling with rollback

### ✅ Message System
- **Streaming Support**: Real-time message updates via Server-Sent Events
- **Message History**: Persistent conversation storage
- **Citations**: Document references in AI responses
- **Metadata**: Model info, tokens, timestamps

### ✅ User Experience
- **Smart Scrolling**: Auto-scroll with user scroll detection
- **Loading States**: Skeleton loading, typing indicators
- **Error States**: User-friendly error messages
- **Empty State**: Suggested questions to get started

### ✅ Keyboard Shortcuts
- **Enter**: Send message
- **Shift + Enter**: New line
- **Escape**: Clear input
- **Cmd/Ctrl + K**: Focus input from anywhere
- **Cmd/Ctrl + Shift + K**: Focus input and clear
- **↑ (Up Arrow)**: Edit last user message (when input is empty)

### ✅ Enhanced Input
- **Auto-resize**: Textarea grows/shrinks with content
- **Character Counter**: Shows count when approaching limit
- **Paste Support**: Multi-line paste handling
- **Model Selection**: Choose between Gemini models
- **Tools Integration**: Pre-built prompts for study materials

### ✅ Visual Enhancements
- **Smooth Animations**: Framer Motion animations
- **Dark/Light Theme**: Automatic theme support
- **Responsive Design**: Works on all screen sizes
- **Scroll Indicators**: "Scroll to bottom" button when needed

## API Reference

### useChat Hook

```tsx
const {
  // State
  messages,           // ChatMessage[]
  isLoading,         // boolean
  isStreaming,       // boolean
  streamingMessage,  // string
  error,            // string | null
  documentContext,  // DocumentContext | null
  currentConversation, // string | null
  
  // Computed
  hasMessages,      // boolean
  lastMessage,      // ChatMessage | undefined
  canRegenerateLastMessage, // boolean
  suggestedQuestions, // string[]
  
  // Actions
  sendMessage,      // (content: string) => Promise<void>
  clearChat,        // () => Promise<void>
  regenerateLastMessage, // () => Promise<void>
  createConversation, // () => Promise<string | null>
  setError,         // (error: string | null) => void
  resetState        // () => void
} = useChat(documentId, conversationId)
```

### ChatContainer Props

```tsx
interface ChatContainerProps {
  documentId?: string              // Document to chat about
  conversationId?: string          // Existing conversation ID
  selectedModel?: GeminiModelKey   // AI model selection
  onModelChange?: (model: GeminiModelKey) => void
}
```

### ChatMessage Type

```tsx
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
  citations?: Citation[]
  metadata?: {
    model?: string
    tokens?: number
    temperature?: number
  }
}
```

## Database Schema

The chat system expects these Supabase tables:

```sql
-- Chat messages table
CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  document_id TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table (for context)
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  -- other document fields...
);

-- Document sections (for detailed context)
CREATE TABLE sections (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES documents(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  page_number INTEGER,
  -- other section fields...
);
```

## Environment Setup

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_key
# or
GOOGLE_AI_API_KEY=your_google_ai_key
```

## Styling & Customization

The chat system uses Tailwind CSS with CSS variables for theming:

```css
/* Custom chat styles can be added to globals.css */
.chat-message-user {
  @apply bg-primary/10 text-foreground border-primary/20;
}

.chat-message-ai {
  @apply bg-muted text-foreground border-border;
}

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--muted-foreground)) transparent;
}
```

## Performance Optimizations

- **React.memo**: Components are memoized to prevent unnecessary re-renders
- **useCallback**: Event handlers are memoized
- **Efficient Scrolling**: Smart auto-scroll with user control detection
- **Zustand Devtools**: Development debugging support
- **Optimistic Updates**: Immediate UI feedback before server confirmation

## Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Automatic retry mechanisms
- **API Errors**: User-friendly error messages
- **Validation Errors**: Input validation with feedback
- **State Recovery**: Rollback on failed operations

## Keyboard Shortcuts Reference

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Escape` | Clear input |
| `Cmd/Ctrl + K` | Focus input from anywhere |
| `Cmd/Ctrl + Shift + K` | Focus and clear input |
| `↑` (Up Arrow) | Edit last user message |
| `Cmd/Ctrl + A` | Select all text |
| `Cmd/Ctrl + V` | Paste with multi-line support |

## Best Practices

1. **Always provide documentId** for context-aware conversations
2. **Handle loading states** in your UI
3. **Show error states** to users with retry options  
4. **Use the useChat hook** for simplified integration
5. **Test keyboard shortcuts** to ensure they work in your app context
6. **Implement proper error boundaries** around chat components

## Troubleshooting

### Common Issues

1. **"Messages not persisting"**
   - Check Supabase connection and table schema
   - Verify environment variables are set correctly

2. **"Streaming not working"**
   - Ensure your API endpoint supports Server-Sent Events
   - Check browser network tab for SSE connection

3. **"Keyboard shortcuts not working"**
   - Check for event handler conflicts
   - Ensure focus management is working correctly

4. **"Messages not scrolling"**
   - Verify container has proper height constraints
   - Check CSS overflow properties

### Debug Mode

Enable Zustand devtools in development:

```tsx
// The store already includes devtools in development mode
// Open Redux DevTools to inspect state changes
```

## Contributing

When contributing to the chat system:

1. **Maintain TypeScript types** for all new features
2. **Add tests** for new functionality
3. **Follow the existing patterns** for consistency
4. **Update this documentation** for any changes
5. **Test keyboard shortcuts** across different browsers

## Migration Guide

If migrating from the old useState-based chat:

1. **Replace useState calls** with `useChat` hook
2. **Update component props** to use new interfaces
3. **Remove manual scroll handling** (now automatic)
4. **Update keyboard event handlers** (now built-in)
5. **Test message persistence** with new store