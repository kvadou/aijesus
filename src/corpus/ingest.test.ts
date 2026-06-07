import { describe, it, expect, vi } from "vitest";
import { ingest } from "@/corpus/ingest";
import { AUTHORITY_TIER, type SourceAdapter } from "@/corpus/types";
import * as embedMod from "@/corpus/embed";
import * as storeMod from "@/corpus/store";

describe("ingest", () => {
  it("fetches, chunks, embeds, and stores each adapter's docs", async () => {
    const adapter: SourceAdapter = {
      sourceId: "web",
      fetch: async () => [{
        sourceId: "web", work: "John", book: "John",
        authorityTier: AUTHORITY_TIER.CANON, era: "1st century", license: "public domain",
        verses: [
          { reference: "John 3:16", chapter: 3, verse: 16, text: "a" },
          { reference: "John 3:17", chapter: 3, verse: 17, text: "b" },
        ],
      }],
    };
    const embedSpy = vi.spyOn(embedMod, "embed").mockResolvedValue([[0.1]]);
    const insertSpy = vi.spyOn(storeMod, "insertChunks").mockResolvedValue();
    const count = await ingest({} as any, [adapter], 3);
    expect(count).toBe(1);
    expect(embedSpy).toHaveBeenCalledWith(["a b"], "document");
    expect(insertSpy).toHaveBeenCalledOnce();
  });
});
