-- Multilingual bibel-RAG: HelloAO / public domain (BSB, swe_fol, HBOMAS, grc_sbl)

alter table testimony.bible_chunks
  add column if not exists translation_id text,
  add column if not exists language text,
  add column if not exists usfm text,
  add column if not exists chapter int,
  add column if not exists verse int;

-- Legacy seed-rader utan översättning
update testimony.bible_chunks
set translation_id = coalesce(translation_id, 'legacy'),
    language = coalesce(language, 'sv'),
    usfm = coalesce(usfm, reference)
where translation_id is null;

alter table testimony.bible_chunks
  alter column translation_id set default 'legacy';

create index if not exists bible_chunks_translation_usfm_idx
  on testimony.bible_chunks (translation_id, usfm);

alter table testimony.bible_chunks drop constraint if exists bible_chunks_reference_key;

create unique index if not exists bible_chunks_translation_usfm_key
  on testimony.bible_chunks (translation_id, usfm);

create index if not exists bible_chunks_language_idx
  on testimony.bible_chunks (language);

-- HNSW för snabb vektorsökning (körs säkert även med få rader)
create index if not exists bible_chunks_embedding_hnsw_idx
  on testimony.bible_chunks using hnsw (embedding vector_cosine_ops);

create or replace function testimony.match_bible_chunks(
  query_embedding vector(1536),
  match_count int default 10,
  min_similarity float default 0.22,
  filter_languages text[] default null
)
returns table (
  id uuid,
  reference text,
  content text,
  similarity float,
  translation_id text,
  language text,
  usfm text
)
language sql stable
security definer
set search_path = testimony, public
as $$
  select
    bc.id,
    bc.reference,
    bc.content,
    1 - (bc.embedding <=> query_embedding) as similarity,
    bc.translation_id,
    bc.language,
    bc.usfm
  from testimony.bible_chunks bc
  where bc.embedding is not null
    and 1 - (bc.embedding <=> query_embedding) >= min_similarity
    and (filter_languages is null or bc.language = any(filter_languages))
  order by bc.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function testimony.match_bible_chunks(vector, int, float, text[]) to anon, authenticated, service_role;
