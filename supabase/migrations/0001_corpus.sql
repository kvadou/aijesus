create extension if not exists vector;

create table if not exists corpus_chunks (
  id            bigint generated always as identity primary key,
  source_id     text    not null,
  work          text    not null,
  reference     text    not null,
  book          text,
  chapter       int,
  verse_start   int,
  verse_end     int,
  authority_tier smallint not null,
  era           text,
  license       text    not null,
  text          text    not null,
  embedding     vector(1024),
  tsv           tsvector generated always as (to_tsvector('english', text)) stored
);

create index if not exists corpus_chunks_embedding_idx
  on corpus_chunks using hnsw (embedding vector_cosine_ops);

create index if not exists corpus_chunks_tsv_idx
  on corpus_chunks using gin (tsv);

create index if not exists corpus_chunks_reference_idx
  on corpus_chunks (source_id, reference);
