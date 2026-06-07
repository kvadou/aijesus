import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Chunk } from "@/corpus/types";

export function makeClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function insertChunks(
  client: SupabaseClient,
  chunks: Chunk[],
  embeddings: number[][],
): Promise<void> {
  const rows = chunks.map((c, i) => ({
    source_id: c.sourceId,
    work: c.work,
    reference: c.reference,
    book: c.book,
    chapter: c.chapter,
    verse_start: c.verseStart,
    verse_end: c.verseEnd,
    authority_tier: c.authorityTier,
    era: c.era,
    license: c.license,
    text: c.text,
    embedding: embeddings[i],
  }));
  const { error } = await client.from("corpus_chunks").insert(rows);
  if (error) throw new Error(error.message);
}
