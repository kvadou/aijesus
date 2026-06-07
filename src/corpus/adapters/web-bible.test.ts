import { describe, it, expect, vi, beforeEach } from "vitest";
import { BibleApiAdapter } from "@/corpus/adapters/web-bible";
import { AUTHORITY_TIER } from "@/corpus/types";

const sampleChapter = {
  verses: [
    { book_name: "John", chapter: 3, verse: 16, text: "For God so loved the world..." },
    { book_name: "John", chapter: 3, verse: 17, text: "For God didn't send his Son..." },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify(sampleChapter), { status: 200 })
  ));
});

describe("BibleApiAdapter", () => {
  it("maps API verses into RawDoc with canon tier and correct references", async () => {
    const adapter = new BibleApiAdapter({
      sourceId: "web", translation: "web", books: [{ book: "John", chapters: 1 }],
    });
    const docs = await adapter.fetch();
    expect(docs).toHaveLength(1);
    expect(docs[0].sourceId).toBe("web");
    expect(docs[0].authorityTier).toBe(AUTHORITY_TIER.CANON);
    expect(docs[0].verses[0].reference).toBe("John 3:16");
    expect(docs[0].verses).toHaveLength(2);
  });
});
