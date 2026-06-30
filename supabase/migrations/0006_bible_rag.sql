-- Bibel-RAG: vektorindex för frågor om Bibeln och Jesus
create extension if not exists vector;

create table if not exists public.bible_chunks (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  book text,
  testament text check (testament in ('gt', 'nt')),
  topic text,
  content text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists bible_chunks_reference_idx on public.bible_chunks(reference);

-- HNSW-index när tillräckligt med chunks finns (skapas manuellt efter ingest)

alter table public.bible_chunks enable row level security;

drop policy if exists bible_chunks_public_read on public.bible_chunks;
create policy bible_chunks_public_read on public.bible_chunks
  for select using (true);

-- Endast service role skriver (ingest-script)

create or replace function public.match_bible_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  min_similarity float default 0.3
)
returns table (
  id uuid,
  reference text,
  content text,
  similarity float
)
language sql stable
security definer
set search_path = public
as $$
  select
    bc.id,
    bc.reference,
    bc.content,
    1 - (bc.embedding <=> query_embedding) as similarity
  from public.bible_chunks bc
  where bc.embedding is not null
    and 1 - (bc.embedding <=> query_embedding) >= min_similarity
  order by bc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_bible_chunks(vector, int, float) to anon, authenticated, service_role;

-- Logg för bibel-AI (GDPR: ingen PII i frågor lagras längre än nödvändigt)
create table if not exists public.bible_ai_queries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  question_hash text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.bible_ai_queries enable row level security;

drop policy if exists bible_ai_queries_self_read on public.bible_ai_queries;
create policy bible_ai_queries_self_read on public.bible_ai_queries
  for select using (auth.uid() = user_id);
