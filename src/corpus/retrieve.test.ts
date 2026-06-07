import { describe, it, expect, vi, beforeEach } from "vitest";
import * as embedMod from "@/corpus/embed";
import * as rerankMod from "@/corpus/rerank";
import { searchCorpus } from "@/corpus/retrieve";

beforeEach(() => {
  vi.spyOn(embedMod, "embed").mockResolvedValue([[0.1, 0.2]]);
  vi.spyOn(rerankMod, "rerank").mockResolvedValue([
    { index: 1, score: 0.95 },
    { index: 0, score: 0.40 },
  ]);
});

describe("searchCorpus", () => {
  it("reranks candidates and returns Passages ordered by relevance", async () => {
    const candidates = [
      { id: 1, source_id: "web", work: "John", reference: "John 1:1", book: "John", chapter: 1, verse_start: 1, verse_end: 1, authority_tier: 1, era: "1st century", license: "public domain", text: "In the beginning", distance: 0.5 },
      { id: 2, source_id: "web", work: "John", reference: "John 10:11", book: "John", chapter: 10, verse_start: 11, verse_end: 11, authority_tier: 1, era: "1st century", license: "public domain", text: "I am the good shepherd", distance: 0.3 },
    ];
    const rpc = vi.fn().mockResolvedValue({ data: candidates, error: null });
    const fakeClient = { rpc } as any;
    const passages = await searchCorpus(fakeClient, "who is the good shepherd?", 2);
    expect(rpc).toHaveBeenCalledWith("match_corpus", expect.objectContaining({ query_text: "who is the good shepherd?" }));
    expect(passages[0].reference).toBe("John 10:11");
    expect(passages[0].score).toBe(0.95);
    expect(passages).toHaveLength(2);
  });
});
