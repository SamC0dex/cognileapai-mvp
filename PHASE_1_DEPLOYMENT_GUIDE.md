# 🚀 PHASE 1 DEPLOYMENT GUIDE

**Status**: ✅ All code complete - Ready for deployment
**Date**: 2025-01-10

---

## 📋 OVERVIEW

Phase 1 (Foundation: Database & Auth Setup) is **100% code complete**. This guide walks you through the final deployment steps to activate authentication in your CogniLeapAI MVP.

---

## ✅ WHAT'S ALREADY DONE

### 1. **Code Files Created** (6 files)
- ✅ `src/lib/supabase/client.ts` - Browser-side Supabase client
- ✅ `src/lib/supabase/server.ts` - Server-side Supabase client
- ✅ `src/lib/supabase/middleware.ts` - Session management helper
- ✅ `src/middleware.ts` - Route protection middleware
- ✅ `src/contexts/auth-context.tsx` - Auth state provider
- ✅ `supabase/migrations/20250210_add_user_auth.sql` - Complete database migration

### 2. **Code Files Modified** (1 file)
- ✅ `src/app/layout.tsx` - AuthProvider integrated into app

### 3. **Dependencies Installed**
- ✅ `@supabase/ssr@0.7.0` - Supabase SSR package for Next.js 15
- ✅ `@supabase/supabase-js@2.75.0` - Supabase JavaScript client

### 4. **MCP Configuration**
- ✅ Supabase MCP server configured in `.mcp.json`

---

## 🔧 DEPLOYMENT STEPS

### STEP 1: Run Database Migration

**Option A: Using Supabase SQL Editor (Recommended)**

1. Open your Supabase Dashboard: https://app.supabase.com/project/yuvzjoctebwsvubtveyi
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/20250210_add_user_auth.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl/Cmd + Enter)
7. Verify success message: "Created X user-based RLS policies"

**Option B: Using Supabase CLI**

```bash
# If you have Supabase CLI installed
npx supabase db push
```

**Expected Result:**
- ✅ `user_id` columns added to `documents` and `conversations` tables
- ✅ 26+ RLS policies created for all tables
- ✅ `profiles` table created with auto-creation trigger
- ✅ All tables have RLS enabled

---

### STEP 2: Configure Authentication Providers

#### Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Ensure **Email** provider is enabled
3. Configure email templates (optional):
   - **Confirm signup** - Customize with your branding
   - **Reset password** - Customize with your branding

#### Enable Google OAuth (Optional but Recommended)

1. Go to **Authentication** → **Providers**
2. Find **Google** and click **Enable**
3. **Get Google OAuth Credentials:**
   - Go to https://console.cloud.google.com
   - Create a new project or select existing
   - Enable **Google+ API**
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs:
     ```
     https://yuvzjoctebwsvubtveyi.supabase.co/auth/v1/callback
     http://localhost:3000/auth/callback
     ```
   - Copy **Client ID** and **Client Secret**
4. **Configure in Supabase:**
   - Paste Client ID and Client Secret
   - Click **Save**

#### Configure URL Settings

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: `http://localhost:3000`
3. Set **Redirect URLs** (add these):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```
4. Click **Save**

---

### STEP 3: Verify RLS Policies

Run these verification queries in **SQL Editor**:

```sql
-- 1. Check user_id columns exist
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
ORDER BY table_name;

-- Expected: documents and conversations tables should show user_id column
```

```sql
-- 2. Check RLS policies created
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Users can%'
ORDER BY tablename, policyname;

-- Expected: 26+ policies across all tables
```

```sql
-- 3. Verify RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'sections', 'outputs', 'conversations', 'messages', 'pdf_chunks', 'profiles');

-- Expected: rowsecurity = true for all tables
```

---

### STEP 4: Create Test Users

1. Go to **Authentication** → **Users** in Supabase Dashboard
2. Click **Add User** → **Create new user**
3. Create two test users:
   - **User 1**: `test1@example.com` / `TestPassword123!`
   - **User 2**: `test2@example.com` / `TestPassword123!`
4. Click **Auto Confirm User** for both (skip email verification for testing)

---

### STEP 5: Test Data Isolation

**Test in Supabase SQL Editor:**

```sql
-- This test simulates User 1 trying to access User 2's data
-- Set the JWT to User 1's ID (get from auth.users table)
SET LOCAL request.jwt.claims = '{"sub": "<USER_1_ID>"}';

-- Try to query all documents (should only see User 1's documents)
SELECT * FROM documents;

-- Expected: Empty result (no documents for User 1 yet)

-- Insert a document for User 1
INSERT INTO documents (title, user_id)
VALUES ('User 1 Document', '<USER_1_ID>');

-- Query again
SELECT * FROM documents;

-- Expected: Should see "User 1 Document"

-- Try to insert document with User 2's ID (should fail)
INSERT INTO documents (title, user_id)
VALUES ('Hacked Document', '<USER_2_ID>');

-- Expected: ERROR - RLS policy violation
```

---

### STEP 6: Test Application Flow

1. **Start development server:**
   ```bash
   pnpm dev
   ```

2. **Test unauthenticated access:**
   - Navigate to http://localhost:3000/dashboard
   - **Expected**: Redirect to `/auth/sign-in` (when auth pages are created)

3. **Test route protection:**
   - Middleware is active and protecting routes
   - Static files are excluded from auth checks

---

## 🎯 SUCCESS CRITERIA

After completing all steps, verify:

- [ ] Migration ran successfully with no errors
- [ ] All RLS policies created (26+ policies)
- [ ] Email provider enabled in Supabase
- [ ] Google OAuth configured (optional)
- [ ] Test users created
- [ ] Data isolation verified (User 1 can't see User 2's data)
- [ ] Route protection working (redirects to sign-in)
- [ ] No TypeScript errors in Phase 1 files
- [ ] AuthProvider accessible throughout app

---

## 📊 WHAT'S NEXT: PHASE 2

Once Phase 1 deployment is complete, proceed to **Phase 2: Authentication Pages**:

- Create sign-up page (`/auth/sign-up`)
- Create sign-in page (`/auth/sign-in`)
- Create forgot-password page
- Create OAuth callback handler
- Test complete auth flows

See `docs/PROGRESS_TRACKER.md` for Phase 2 details.

---

## 🚨 TROUBLESHOOTING

### Migration Errors

**Error**: "relation does not exist"
- **Fix**: Ensure you're running migration on the correct database
- Check project ref matches: `yuvzjoctebwsvubtveyi`

**Error**: "policy already exists"
- **Fix**: Migration is idempotent, old policies are dropped first
- Safe to re-run migration

### RLS Policy Issues

**Problem**: Users can see other users' data
- **Fix**: Verify RLS is enabled: `ALTER TABLE documents ENABLE ROW LEVEL SECURITY;`
- Check user_id columns are populated correctly

**Problem**: Service role can't access data
- **Fix**: Service role bypasses RLS (this is correct behavior)
- Use authenticated client for user operations

### Auth Provider Issues

**Problem**: Google OAuth not working
- **Fix**: Verify redirect URIs match exactly in Google Console
- Check Client ID/Secret are correct in Supabase

---

## 📞 SUPPORT

If you encounter issues:

1. Check Supabase Dashboard → **Logs** for errors
2. Review `docs/AUTH_IMPLEMENTATION.md` for implementation details
3. Review `docs/DATABASE_MIGRATION_PLAN.md` for migration details
4. Check browser console for client-side errors
5. Verify environment variables in `.env.local`

---

**Phase 1 Status**: ✅ CODE COMPLETE - Ready for deployment
**Next Action**: Run database migration in Supabase Dashboard (Step 1)
