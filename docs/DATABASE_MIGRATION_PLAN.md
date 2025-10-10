# DATABASE MIGRATION PLAN

**Last Updated**: 2025-01-10
**Status**: READY FOR IMPLEMENTATION
**Migration File**: `supabase/migrations/20250210_add_user_auth.sql`

---

## 🎯 OBJECTIVES

This migration transforms the database from service-role-only access to multi-tenant user-based access with complete data isolation via Row Level Security (RLS).

**Goals:**
- Add `user_id` columns to all user-data tables
- Create user-based RLS policies for data isolation
- Maintain backward compatibility during migration
- Ensure zero data loss

---

## 📊 CURRENT DATABASE STATE

### Existing Tables
```sql
documents      -- Stores PDF metadata
sections       -- Document sections (hierarchy)
outputs        -- Generated study materials
conversations  -- Chat conversations
messages       -- Chat messages
pdf_chunks     -- Document chunks with embeddings
```

### Current RLS Policies
```sql
-- Service role only - blocks all access
create policy documents_service_only on public.documents
  for all using (false) with check (false);

create policy sections_service_only on public.sections
  for all using (false) with check (false);

create policy outputs_service_only on public.outputs
  for all using (false) with check (false);
```

**Problem**: Users cannot access their own data through authenticated queries.

---

## 🔄 MIGRATION STRATEGY

### Phase 1: Add user_id Columns
Add `user_id` to tables that should be user-owned.

### Phase 2: Update Existing Data (Optional)
For testing, you can manually assign existing data to test users.

### Phase 3: Drop Old Policies
Remove service-role-only policies.

### Phase 4: Create User-Based Policies
Implement RLS policies that check `auth.uid() = user_id`.

### Phase 5: Create Cascade Policies
Related tables inherit access via parent table relationships.

---

## 📝 COMPLETE MIGRATION SQL

**File**: `supabase/migrations/20250210_add_user_auth.sql`

```sql
-- =====================================================
-- Migration: Add User Authentication & Multi-Tenant RLS
-- Description: Transform database to support user-based authentication
--              with complete data isolation via Row Level Security
-- Date: 2025-01-10
-- =====================================================

-- =====================================================
-- STEP 1: Add user_id columns to user-owned tables
-- =====================================================

-- Add user_id to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS documents_user_id_idx ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);

COMMENT ON COLUMN public.documents.user_id IS 'Owner of the document';
COMMENT ON COLUMN public.conversations.user_id IS 'Owner of the conversation';

-- =====================================================
-- STEP 2: Create helper function for RLS policies
-- =====================================================

-- Function to get current user ID (safer than direct auth.uid())
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    auth.uid(),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid
  );
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION auth.user_id() IS 'Safely get the current authenticated user ID';

-- =====================================================
-- STEP 3: Drop old service-role-only policies
-- =====================================================

DROP POLICY IF EXISTS documents_service_only ON public.documents;
DROP POLICY IF EXISTS sections_service_only ON public.sections;
DROP POLICY IF EXISTS outputs_service_only ON public.outputs;

-- =====================================================
-- STEP 4: Create RLS policies for documents table
-- =====================================================

-- Users can view their own documents
CREATE POLICY "Users can view own documents"
ON public.documents
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own documents
CREATE POLICY "Users can insert own documents"
ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own documents
CREATE POLICY "Users can update own documents"
ON public.documents
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own documents
CREATE POLICY "Users can delete own documents"
ON public.documents
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- STEP 5: Create RLS policies for sections table
-- =====================================================

-- Users can view sections of their documents
CREATE POLICY "Users can view sections of their documents"
ON public.sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can insert sections for their documents
CREATE POLICY "Users can insert sections for their documents"
ON public.sections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can update sections of their documents
CREATE POLICY "Users can update sections of their documents"
ON public.sections
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can delete sections of their documents
CREATE POLICY "Users can delete sections of their documents"
ON public.sections
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = sections.document_id
      AND documents.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 6: Create RLS policies for outputs table
-- =====================================================

-- Users can view outputs of their documents
CREATE POLICY "Users can view outputs of their documents"
ON public.outputs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can insert outputs for their documents
CREATE POLICY "Users can insert outputs for their documents"
ON public.outputs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can update outputs of their documents
CREATE POLICY "Users can update outputs of their documents"
ON public.outputs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can delete outputs of their documents
CREATE POLICY "Users can delete outputs of their documents"
ON public.outputs
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = outputs.document_id
      AND documents.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 7: Create RLS policies for conversations table
-- =====================================================

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own conversations"
ON public.conversations
FOR DELETE
USING (auth.uid() = user_id);

-- =====================================================
-- STEP 8: Create RLS policies for messages table
-- =====================================================

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);

-- Users can insert messages in their conversations
CREATE POLICY "Users can insert messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);

-- Users can update messages in their conversations
CREATE POLICY "Users can update messages in their conversations"
ON public.messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);

-- Users can delete messages in their conversations
CREATE POLICY "Users can delete messages in their conversations"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE conversations.id = messages.conversation_id
      AND conversations.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 9: Create RLS policies for pdf_chunks table
-- =====================================================

-- Update existing policies for pdf_chunks
DROP POLICY IF EXISTS "pdf_chunks_select_policy" ON public.pdf_chunks;
DROP POLICY IF EXISTS "pdf_chunks_insert_policy" ON public.pdf_chunks;
DROP POLICY IF EXISTS "pdf_chunks_update_policy" ON public.pdf_chunks;
DROP POLICY IF EXISTS "pdf_chunks_delete_policy" ON public.pdf_chunks;

-- Users can view chunks of their documents
CREATE POLICY "Users can view chunks of their documents"
ON public.pdf_chunks
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can insert chunks for their documents
CREATE POLICY "Users can insert chunks for their documents"
ON public.pdf_chunks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can update chunks of their documents
CREATE POLICY "Users can update chunks of their documents"
ON public.pdf_chunks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = auth.uid()
  )
);

-- Users can delete chunks of their documents
CREATE POLICY "Users can delete chunks of their documents"
ON public.pdf_chunks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.documents
    WHERE documents.id = pdf_chunks.document_id
      AND documents.user_id = auth.uid()
  )
);

-- =====================================================
-- STEP 10: Create profiles table (Optional - for future)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create index
CREATE INDEX IF NOT EXISTS profiles_id_idx ON public.profiles(id);

COMMENT ON TABLE public.profiles IS 'User profile information';

-- =====================================================
-- STEP 11: Create trigger to auto-create profile
-- =====================================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically create profile when user signs up';

-- =====================================================
-- STEP 12: Add helpful comments
-- =====================================================

COMMENT ON POLICY "Users can view own documents" ON public.documents IS
  'Users can only view documents they own';

COMMENT ON POLICY "Users can view sections of their documents" ON public.sections IS
  'Users can view sections only if they own the parent document';

COMMENT ON POLICY "Users can view outputs of their documents" ON public.outputs IS
  'Users can view study materials only for their documents';

COMMENT ON POLICY "Users can view own conversations" ON public.conversations IS
  'Users can only view their own chat conversations';

COMMENT ON POLICY "Users can view messages in their conversations" ON public.messages IS
  'Users can view messages only in conversations they own';

-- =====================================================
-- STEP 13: Verify RLS is enabled on all tables
-- =====================================================

-- Ensure RLS is enabled (should already be from previous migrations)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_chunks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Verify policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname LIKE '%Users can%';

  RAISE NOTICE 'Created % user-based RLS policies', policy_count;
END $$;
```

---

## 🔍 VERIFICATION QUERIES

After running the migration, verify everything is set up correctly:

### 1. Check user_id Columns
```sql
-- Verify user_id columns exist
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'user_id'
ORDER BY table_name;
```

**Expected Result:**
```
table_name    | column_name | data_type | is_nullable
--------------|-------------|-----------|-------------
conversations | user_id     | uuid      | YES
documents     | user_id     | uuid      | YES
```

### 2. Check RLS Policies
```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected**: Policies named "Users can..." for all tables.

### 3. Test User Isolation
```sql
-- This query should return 0 when run as different users
-- (Test after creating test users)
SELECT COUNT(*)
FROM public.documents
WHERE user_id != auth.uid();
```

**Expected Result**: `0` (users can only see their own documents)

### 4. Check Indexes
```sql
-- Verify performance indexes exist
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%user_id%'
ORDER BY tablename;
```

---

## 🧪 TESTING STRATEGY

### Test 1: Create Test Users
```sql
-- In Supabase dashboard, create 2 test users:
-- user1@test.com
-- user2@test.com
```

### Test 2: Insert Test Data
```typescript
// Sign in as user1@test.com
const { data: doc1 } = await supabase
  .from('documents')
  .insert({
    title: 'User 1 Document',
    user_id: user1_id, // Auto-filled by trigger or manually
  })
  .select()
  .single()

// Sign in as user2@test.com
const { data: doc2 } = await supabase
  .from('documents')
  .insert({
    title: 'User 2 Document',
    user_id: user2_id,
  })
  .select()
  .single()
```

### Test 3: Verify Isolation
```typescript
// Sign in as user1@test.com
const { data } = await supabase
  .from('documents')
  .select('*')

// Should only see User 1's documents, not User 2's
console.log(data) // Only shows "User 1 Document"
```

### Test 4: Test Cascade Access
```typescript
// Sign in as user1@test.com
// Try to access sections of User 1's document
const { data: sections } = await supabase
  .from('sections')
  .select('*')
  .eq('document_id', doc1.id)

// Should work ✅

// Try to access sections of User 2's document
const { data: otherSections, error } = await supabase
  .from('sections')
  .select('*')
  .eq('document_id', doc2.id)

// Should return empty array (RLS blocks access) ✅
```

---

## 🔧 API UPDATES REQUIRED

After migration, update API routes to use authenticated user:

### Before (Service Role):
```typescript
// src/app/api/upload/route.ts
import { supabase } from '@/lib/supabase' // Service role client

export async function POST(request: Request) {
  const { data } = await supabase
    .from('documents')
    .insert({ title: 'Test' })

  return Response.json({ data })
}
```

### After (User Context):
```typescript
// src/app/api/upload/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Insert with user_id
  const { data } = await supabase
    .from('documents')
    .insert({
      title: 'Test',
      user_id: user.id, // ✅ Associate with user
    })

  return Response.json({ data })
}
```

**Key Changes:**
1. Use `createClient()` from `@/lib/supabase/server` (not service role)
2. Get authenticated user with `getUser()`
3. Check if user exists (return 401 if not)
4. Include `user_id` in all inserts

---

## 🚨 ROLLBACK PLAN

If something goes wrong, run this rollback:

```sql
-- Rollback migration
BEGIN;

-- Remove new policies
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;

-- ... (repeat for all tables)

-- Restore service-role policies
CREATE POLICY documents_service_only ON public.documents
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY sections_service_only ON public.sections
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY outputs_service_only ON public.outputs
  FOR ALL USING (false) WITH CHECK (false);

-- Remove user_id columns (optional - keeps data)
-- ALTER TABLE public.documents DROP COLUMN IF EXISTS user_id;
-- ALTER TABLE public.conversations DROP COLUMN IF EXISTS user_id;

COMMIT;
```

---

## ✅ MIGRATION CHECKLIST

- [ ] Backup database before migration
- [ ] Run migration SQL in Supabase SQL Editor
- [ ] Verify no errors in migration
- [ ] Run verification queries
- [ ] Create test users
- [ ] Test data isolation
- [ ] Update API routes to use authenticated client
- [ ] Test all API endpoints
- [ ] Test frontend functionality
- [ ] Verify performance (check slow query log)

---

**End of Database Migration Plan**
