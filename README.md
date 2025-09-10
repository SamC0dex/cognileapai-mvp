# CogniLeap MVP

🧠 **Transform PDFs into AI-powered study materials**

A desktop-first web application that processes PDFs and generates comprehensive study materials including study guides, summaries, and notes with intelligent outline detection.

## ✨ Features

- **📄 PDF Processing** - Upload text-selectable PDFs up to 200 pages
- **🤖 Smart Outline Detection** - Automatically detects document structure and sections
- **📚 Study Guide Generation** - AI-powered concepts, checks, and pitfalls
- **📝 Summaries** - Concise bullet points with key terms
- **📖 Structured Notes** - Organized hierarchical notes per section
- **📋 Markdown Export** - Download or copy all materials
- **🌓 Light/Dark Themes** - Clean, professional design system
- **♿ Accessible** - Keyboard navigation and screen reader support

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion
- **Backend**: Next.js API Routes, Vercel AI SDK
- **Database**: Supabase (PostgreSQL + Storage)
- **AI**: Google Gemini 2.5 Pro/Flash models
- **Styling**: Custom design system with teal/amber accents

## 🚀 Quick Start

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your API keys
3. Install dependencies: `pnpm install`
4. Run the development server: `pnpm dev`
5. Open [http://localhost:3000](http://localhost:3000)

## 📋 Environment Setup

You'll need:
- Google Gemini API key
- Supabase project (database + storage)

See `.env.example` for required environment variables.

## 🏗️ Architecture

- **Frontend**: React components with TypeScript
- **API**: RESTful endpoints + Server-Sent Events for streaming
- **Database**: PostgreSQL with Row Level Security
- **Storage**: Supabase Storage for PDF files
- **AI**: Gemini models via Vercel AI SDK for efficient streaming

## 📖 Documentation

- [API Documentation](docs/API_CONTRACTS.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)
- [UI Design System](docs/UI_DESIGN_SYSTEM.md)
- [Security & Privacy](docs/SECURITY_PRIVACY.md)

## 🔒 Security

- All PDFs stored securely in private Supabase storage
- API keys never exposed to client
- Row Level Security (RLS) enabled on all database tables
- No user data logged in telemetry

## 🎨 Design Philosophy

- **Desktop-first**: Optimized for productivity workflows
- **Calm UI**: Subtle animations, no distracting gradients
- **Accessibility**: WCAG AA compliance, keyboard navigation
- **Performance**: Fast loading, efficient streaming

## 📄 License

MIT License - feel free to use this project as a foundation for your own applications.


