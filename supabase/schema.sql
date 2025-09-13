-- CogniLeapAI MVP schema (run in Supabase SQL editor)
create extension if not exists "uuid-ossp";

-- Type for outputs
create type output_type as enum ('summary', 'notes', 'study_guide');

-- Documents
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  page_count int not null default 0,
  bytes bigint not null default 0,
  storage_path text, -- path in storage bucket
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sections
create table if not exists public.sections (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  ord int not null,
  title text not null,
  page_start int not null default 1,
  page_end int not null default 1,
  parent_id uuid references public.sections(id) on delete set null,
  status text not null default 'idle'
);
create index if not exists sections_doc_ord_idx on public.sections(document_id, ord);

-- Outputs (unified)
create table if not exists public.outputs (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid not null references public.documents(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  overall boolean not null default false,
  type output_type not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(document_id, section_id, overall, type)
);
create index if not exists outputs_doc_sec_type_idx on public.outputs(document_id, section_id, type);

-- Conversations for chat functionality
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  title text,
  document_id uuid references public.documents(id) on delete cascade,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages for chat functionality
create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sequence_number int not null,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(conversation_id, sequence_number)
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_sequence_idx on public.messages(conversation_id, sequence_number);
create index if not exists conversations_document_id_idx on public.conversations(document_id);

-- Storage bucket should be created as 'documents' via UI; ensure it's private

