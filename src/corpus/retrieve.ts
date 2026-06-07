import type { SupabaseClient } from "@supabase/supabase-js";
import type { Passage } from "@/corpus/types";
import { embed } from "@/corpus/embed";
import { rerank } from "@/corpus/rerank";

interface Row {
  id: number; source_id: string; work: string; reference: string; book: string;
  chapter: number | null; verse_start: number | null; verse_end: number | null;
  authority_tier: number; era: string; license: string; text: string;
}

function rowToPassage(r: Row, score?: number): Passage {
  return {
    id: r.id, sourceId: r.source_id, work: r.work, reference: r.reference, book: r.book,
    chapter: r.chapter, verseStart: r.verse_start, verseEnd: r.verse_end,
    authorityTier: r.authority_tier as Passage["authorityTier"],
    era: r.era, license: r.license, text: r.text, score,
  };
}

export async function searchCorpus(client: SupabaseClient, query: string, topK = 8): Promise<Passage[]> {
  const [queryVec] = await embed([query], "query");
  const { data, error } = await client.rpc("match_corpus", {
    query_embedding: queryVec,
    query_text: query,
    match_count: 40,
  });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];
  const ranked = await rerank(query, rows.map((r) => r.text), Math.min(topK, rows.length));
  return ranked.map((r) => rowToPassage(rows[r.index], r.score));
}

export async function getPassage(client: SupabaseClient, reference: string): Promise<Passage[]> {
  const { data, error } = await client.rpc("get_passage", { ref: reference });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => rowToPassage(r));
}
