import type { SupabaseClient } from "@supabase/supabase-js";
import type { SourceAdapter } from "@/corpus/types";
import { chunkDoc } from "@/corpus/chunk";
import { embed } from "@/corpus/embed";
import { insertChunks } from "@/corpus/store";

const EMBED_BATCH = 100;

export async function ingest(
  client: SupabaseClient,
  adapters: SourceAdapter[],
  windowSize = 3,
): Promise<number> {
  let total = 0;
  for (const adapter of adapters) {
    const docs = await adapter.fetch();
    const chunks = docs.flatMap((d) => chunkDoc(d, windowSize));
    for (let i = 0; i < chunks.length; i += EMBED_BATCH) {
      const batch = chunks.slice(i, i + EMBED_BATCH);
      const vectors = await embed(batch.map((c) => c.text), "document");
      await insertChunks(client, batch, vectors);
      total += batch.length;
    }
  }
  return total;
}
