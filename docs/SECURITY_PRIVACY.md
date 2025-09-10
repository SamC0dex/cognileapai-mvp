# Security & Privacy

- Secrets only in .env.local; server uses service role key for Supabase.
- Storage bucket 'documents' is private; files are never public.
- Strip PDF metadata when possible; do not log raw text.
- Rate limit generation endpoints per document to prevent abuse.
- Rotate keys regularly, especially if ever shared in plain text.

