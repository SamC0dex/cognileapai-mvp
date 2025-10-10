# IMPLEMENTATION PHASES - DETAILED GUIDE

**Last Updated**: 2025-01-10
**Purpose**: Step-by-step implementation instructions for each phase

---

## 📋 HOW TO USE THIS GUIDE

1. **Read the phase overview** - Understand what you're building
2. **Check dependencies** - Ensure prerequisites are complete
3. **Follow steps sequentially** - Each step builds on the previous
4. **Test after each step** - Catch issues early
5. **Update progress tracker** - Mark tasks complete

---

## PHASE 1: FOUNDATION (Database & Auth Setup)

**Goal**: Set up authentication infrastructure and database security
**Time**: 2-3 hours
**Dependencies**: None

### STEP 1.1: Install Required Package

```bash
# In your terminal
cd C:\Users\swami\Coding\cognileapai-mvp
pnpm add @supabase/ssr
```

**Verify**: Check `package.json` for `"@supabase/ssr": "^0.1.0"`

---

### STEP 1.2: Create Supabase Client Utilities

#### File: `src/lib/supabase/client.ts`

**Purpose**: Browser client for Client Components

**Code**:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Test**:
```typescript
// In browser console (after implementation)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
console.log(supabase) // Should log Supabase client object
```

---

#### File: `src/lib/supabase/server.ts`

**Purpose**: Server client for Server Components and Actions

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 2)

**Test**:
```typescript
// In a Server Component
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
const { data } = await supabase.auth.getSession()
console.log(data) // Should log null (no session yet)
```

---

#### File: `src/lib/supabase/middleware.ts`

**Purpose**: Helper for Next.js middleware

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 3)

---

### STEP 1.3: Create Middleware for Route Protection

#### File: `src/middleware.ts` (root of src/)

**Purpose**: Protect dashboard routes, redirect authenticated users from auth pages

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 4)

**Test**:
```bash
# Start dev server
pnpm dev

# Visit http://localhost:3000/dashboard
# Should redirect to /auth/sign-in (not implemented yet, will show 404)
```

---

### STEP 1.4: Create Auth Context Provider

#### File: `src/contexts/auth-context.tsx`

**Purpose**: Provide user state across the app

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 5)

---

### STEP 1.5: Update Root Layout

#### File: `src/app/layout.tsx`

**Changes**:
```typescript
// Add at top
import { AuthProvider } from '@/contexts/auth-context'

// Wrap children
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            {/* Existing providers */}
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Test**:
- Server should restart without errors
- No TypeScript errors

---

### STEP 1.6: Create Database Migration

#### File: `supabase/migrations/20250210_add_user_auth.sql`

**Purpose**: Add user_id columns and RLS policies

**Code**: (Copy complete SQL from `DATABASE_MIGRATION_PLAN.md`)

**Execute**:
1. Open Supabase Dashboard → SQL Editor
2. Paste the entire migration SQL
3. Click "Run"
4. Verify "Success" message

**Verify**:
```sql
-- Run this query in Supabase SQL Editor
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'user_id';

-- Should show documents and conversations with user_id
```

---

### STEP 1.7: Test RLS Policies

#### Create Test Users (Supabase Dashboard)

1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Create user: `test1@example.com` / `password123`
4. Create user: `test2@example.com` / `password123`

#### Test in SQL Editor

```sql
-- Simulate being logged in as test1
SET request.jwt.claims = '{"sub": "UUID_OF_TEST1"}';

-- Try to query documents
SELECT * FROM documents;
-- Should return empty (user has no documents yet)

-- Try to insert document
INSERT INTO documents (title, user_id)
VALUES ('Test Doc', 'UUID_OF_TEST1');
-- Should succeed

-- Query again
SELECT * FROM documents;
-- Should show the document you just created
```

---

### ✅ PHASE 1 COMPLETION CHECKLIST

- [ ] @supabase/ssr installed
- [ ] client.ts created
- [ ] server.ts created
- [ ] middleware.ts (lib) created
- [ ] middleware.ts (root) created
- [ ] auth-context.tsx created
- [ ] layout.tsx updated
- [ ] Migration SQL created
- [ ] Migration executed successfully
- [ ] RLS policies verified
- [ ] Test users created
- [ ] No TypeScript errors
- [ ] No console errors

**Update `PROGRESS_TRACKER.md`**: Mark Phase 1 as ✅ COMPLETE

---

## PHASE 2: AUTHENTICATION PAGES

**Goal**: Build sign-up, sign-in, and password reset pages
**Time**: 2-3 hours
**Dependencies**: Phase 1 complete

### STEP 2.1: Create Sign-Up Page

#### File: `src/app/auth/sign-up/page.tsx`

**Purpose**: User registration with email/password and Google OAuth

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 6)

**Styling Notes**:
- Use existing design system classes
- Center the form on screen
- Add gradient background
- Ensure mobile responsive

**Test**:
```bash
pnpm dev
# Visit http://localhost:3000/auth/sign-up
# Form should render without errors
```

---

### STEP 2.2: Create Sign-In Page

#### File: `src/app/auth/sign-in/page.tsx`

**Purpose**: User login with email/password and Google OAuth

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 7)

**Test**:
```bash
# Visit http://localhost:3000/auth/sign-in
# Form should render
# Try signing in with test1@example.com
```

---

### STEP 2.3: Create OAuth Callback Handler

#### File: `src/app/auth/callback/route.ts`

**Purpose**: Handle OAuth redirect after Google sign-in

**Code**: (Copy from `AUTH_IMPLEMENTATION.md` section 8)

---

### STEP 2.4: Configure Google OAuth (Supabase Dashboard)

**Steps**:
1. Go to Supabase Dashboard → Authentication → Providers
2. Click "Google"
3. Toggle "Enable Sign in with Google"
4. **Get Google Credentials**:
   - Go to Google Cloud Console
   - Create new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`
   - Copy Client ID and Client Secret
5. Paste credentials in Supabase
6. Click "Save"

---

### STEP 2.5: Create Forgot Password Page

#### File: `src/app/auth/forgot-password/page.tsx`

**Purpose**: Password reset request

**Code**:
```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the password reset link!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-2xl shadow-card">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your email to receive a reset link
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="p-4 rounded-lg bg-primary/10 text-primary text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border border-border bg-background"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
```

---

### STEP 2.6: Test Complete Auth Flow

**Email/Password Sign-Up**:
1. Visit `/auth/sign-up`
2. Enter email + password
3. Should see success message
4. Check Supabase Dashboard → Authentication → Users (new user should appear)

**Email/Password Sign-In**:
1. Visit `/auth/sign-in`
2. Enter credentials
3. Should redirect to `/dashboard`
4. Check console for user object in AuthContext

**Google OAuth**:
1. Visit `/auth/sign-in`
2. Click "Continue with Google"
3. Complete Google sign-in
4. Should redirect to `/dashboard`

**Forgot Password**:
1. Visit `/auth/forgot-password`
2. Enter email
3. Check email for reset link
4. Click link (should redirect to reset password page)

---

### ✅ PHASE 2 COMPLETION CHECKLIST

- [ ] Sign-up page created
- [ ] Sign-in page created
- [ ] Forgot password page created
- [ ] OAuth callback handler created
- [ ] Google OAuth configured
- [ ] Sign-up flow tested
- [ ] Sign-in flow tested
- [ ] Google OAuth tested
- [ ] Forgot password tested
- [ ] Session persists after browser restart
- [ ] Protected routes redirect properly
- [ ] No TypeScript errors
- [ ] No console errors

**Update `PROGRESS_TRACKER.md`**: Mark Phase 2 as ✅ COMPLETE

---

## PHASE 3: LANDING PAGE STRUCTURE

**Goal**: Build all landing page sections without animations
**Time**: 3-4 hours
**Dependencies**: None (can be done in parallel with Phase 2)

### STEP 3.1: Create Landing Components Directory

```bash
# In terminal
mkdir -p src/components/landing
```

---

### STEP 3.2: Create Hero Section

#### File: `src/components/landing/hero-section.tsx`

**Purpose**: Above-the-fold hero with headline and CTA

**Template**:
```typescript
'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
          Transform PDFs into
          <br />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Powerful Study Materials
          </span>
          <br />
          in Seconds
        </h1>

        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          AI-powered summaries, interactive flashcards, and intelligent chat—
          <br />
          all from your PDFs. Study smarter, not harder.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>

          <button className="px-8 py-4 border border-border rounded-lg font-medium hover:bg-accent transition-all">
            Watch Demo
          </button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Trusted by 1,000+ students • 10,000+ study materials generated
        </p>
      </div>
    </section>
  )
}
```

**Styling Notes**:
- Use responsive text sizes
- Center alignment
- Gradient text for emphasis
- Spacing between elements

---

### STEP 3.3: Create Features Section

#### File: `src/components/landing/features-section.tsx`

**Purpose**: Grid of 6 core features

**Template**:
```typescript
import { Sparkles, LayoutGrid, MessageSquare, Search, Download, Moon } from 'lucide-react'

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Study Tools',
    description: 'Generate comprehensive study guides, smart summaries, and organized notes in seconds. Our AI analyzes your documents and creates structured learning materials tailored to your needs.',
    accent: 'teal',
  },
  {
    icon: LayoutGrid,
    title: 'Interactive Flashcards',
    description: 'Master concepts with intelligent flashcard generation. Swipe through cards, track your progress, and focus on areas that need improvement with our spaced repetition system.',
    accent: 'amber',
  },
  {
    icon: MessageSquare,
    title: 'Smart Document Chat',
    description: 'Ask questions about your PDFs and get instant, contextual answers. Our AI understands your documents deeply and provides precise information with citations.',
    accent: 'teal',
  },
  {
    icon: Search,
    title: 'Advanced Semantic Search',
    description: 'Find exactly what you need with FREE semantic search. Our AI understands context and meaning, not just keywords, to surface the most relevant information.',
    accent: 'amber',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    description: 'Export your study materials to PDF, DOCX, or print-ready formats. Take your notes offline and access them wherever you study.',
    accent: 'teal',
  },
  {
    icon: Moon,
    title: 'Dark Mode First',
    description: 'Beautiful interface designed for late-night study sessions. Easy on the eyes with a professional dark theme and optional light mode.',
    accent: 'amber',
  },
]

export function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold">
            Everything You Need to
            <br />
            Master Your Materials
          </h2>
          <p className="mt-4 text-xl text-muted-foreground max-w-2xl mx-auto">
            Powerful AI tools that transform dense PDFs into
            organized, actionable study materials.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 bg-card rounded-2xl border border-border hover:border-primary/50 hover:shadow-glow transition-all"
              >
                <div className={`w-12 h-12 rounded-lg bg-${feature.accent === 'teal' ? 'primary' : 'accent'}/10 flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 text-${feature.accent === 'teal' ? 'primary' : 'accent'}`} />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
```

---

### STEP 3.4: Create Remaining Sections

**Create these files with content from `LANDING_PAGE_DESIGN.md`**:

- `how-it-works-section.tsx` (3-step process)
- `benefits-section.tsx` (Before/After comparison)
- `demo-showcase-section.tsx` (Video or screenshots)
- `faq-section.tsx` (Accordion with 8 questions)
- `final-cta-section.tsx` (Final conversion section)
- `footer.tsx` (4-column footer)

**Note**: Copy the content structure from the design doc, but implement basic layout without animations first.

---

### STEP 3.5: Update Landing Page

#### File: `src/app/page.tsx`

**Replace existing redirect with**:
```typescript
import { HeroSection } from '@/components/landing/hero-section'
import { FeaturesSection } from '@/components/landing/features-section'
import { HowItWorksSection } from '@/components/landing/how-it-works-section'
import { BenefitsSection } from '@/components/landing/benefits-section'
import { DemoShowcaseSection } from '@/components/landing/demo-showcase-section'
import { FAQSection } from '@/components/landing/faq-section'
import { FinalCTASection } from '@/components/landing/final-cta-section'
import { Footer } from '@/components/landing/footer'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <DemoShowcaseSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </>
  )
}
```

---

### STEP 3.6: Test Responsive Layout

**Test on different viewports**:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1280px width)
- Large desktop (1920px width)

**Check**:
- Text is readable
- No horizontal scroll
- Images/icons display properly
- Spacing looks good
- Dark/light mode works

---

### ✅ PHASE 3 COMPLETION CHECKLIST

- [ ] Landing components directory created
- [ ] Hero section created
- [ ] Features section created
- [ ] How It Works section created
- [ ] Benefits section created
- [ ] Demo section created
- [ ] FAQ section created
- [ ] Final CTA section created
- [ ] Footer created
- [ ] page.tsx updated
- [ ] All content added
- [ ] Responsive on mobile
- [ ] Responsive on tablet
- [ ] Responsive on desktop
- [ ] Dark mode works
- [ ] Light mode works
- [ ] No TypeScript errors

**Update `PROGRESS_TRACKER.md`**: Mark Phase 3 as ✅ COMPLETE

---

## PHASE 4: ANIMATIONS & POLISH

**Goal**: Add smooth animations and polish the design
**Time**: 2-3 hours
**Dependencies**: Phase 3 complete

*Detailed steps for animations would go here - following the animation specs in `LANDING_PAGE_DESIGN.md`*

---

## PHASE 5: INTEGRATION & TESTING

**Goal**: Update API routes for user context and test everything
**Time**: 2-3 hours
**Dependencies**: Phases 1 and 2 complete

*Detailed steps for API updates would go here*

---

## PHASE 6: FINAL OPTIMIZATION

**Goal**: Optimize performance and accessibility
**Time**: 1-2 hours
**Dependencies**: All previous phases complete

*Detailed steps for optimization would go here*

---

**End of Implementation Phases Guide**
