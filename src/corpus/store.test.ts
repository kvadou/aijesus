import { describe, it, expect, vi } from "vitest";
import { insertChunks } from "@/corpus/store";
import { AUTHORITY_TIER, type Chunk } from "@/corpus/types";

const chunk: Chunk = {
  sourceId: "web", work: "John", reference: "John 3:16", book: "John",
  chapter: 3, verseStart: 16, verseEnd: 16, authorityTier: AUTHORITY_TIER.CANON,
  era: "1st century", license: "public domain", text: "For God so loved...",
};

describe("insertChunks", () => {
  it("maps camelCase chunks to snake_case rows with embeddings", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const fakeClient = { from: vi.fn(() => ({ insert })) } as any;
    await insertChunks(fakeClient, [chunk], [[0.1, 0.2]]);
    expect(fakeClient.from).toHaveBeenCalledWith("corpus_chunks");
    const rows = insert.mock.calls[0][0];
    expect(rows[0].source_id).toBe("web");
    expect(rows[0].authority_tier).toBe(1);
    expect(rows[0].embedding).toEqual([0.1, 0.2]);
  });
  it("throws when Supabase returns an error", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: "boom" } });
    const fakeClient = { from: vi.fn(() => ({ insert })) } as any;
    await expect(insertChunks(fakeClient, [chunk], [[0.1]])).rejects.toThrow("boom");
  });
});
