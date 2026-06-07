create or replace function match_corpus(
  query_embedding vector(1024),
  query_text text,
  match_count int default 40
)
returns table (
  id bigint, source_id text, work text, reference text, book text,
  chapter int, verse_start int, verse_end int, authority_tier smallint,
  era text, license text, text text, distance float
)
language sql stable as $$
  with vector_hits as (
    select c.*, (c.embedding <=> query_embedding) as distance
    from corpus_chunks c
    order by c.embedding <=> query_embedding
    limit match_count
  ),
  fts_hits as (
    select c.*, 1.0 as distance
    from corpus_chunks c
    where c.tsv @@ websearch_to_tsquery('english', query_text)
    limit match_count
  )
  select distinct on (id)
    id, source_id, work, reference, book, chapter, verse_start, verse_end,
    authority_tier, era, license, text, distance
  from (select * from vector_hits union all select * from fts_hits) u
  order by id, distance;
$$;

create or replace function get_passage(ref text)
returns setof corpus_chunks
language sql stable as $$
  select * from corpus_chunks
  where reference = ref or reference ilike ref || '%'
  order by authority_tier
  limit 10;
$$;
