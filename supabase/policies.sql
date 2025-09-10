-- Enable RLS
alter table public.documents enable row level security;
alter table public.sections enable row level security;
alter table public.outputs enable row level security;

-- Drop existing policies if re-running (ignore errors)
-- (Execute manually if needed)

-- Service role only policies
create policy documents_service_only on public.documents
  for all using (false) with check (false);
create policy sections_service_only on public.sections
  for all using (false) with check (false);
create policy outputs_service_only on public.outputs
  for all using (false) with check (false);

-- Access is via service key from Next.js server only. No anon access in MVP.

