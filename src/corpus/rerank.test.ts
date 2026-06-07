import { describe, it, expect, vi, beforeEach } from "vitest";
import { rerank } from "@/corpus/rerank";

beforeEach(() => {
  vi.stubEnv("VOYAGE_API_KEY", "test-key");
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({
      data: [{ index: 2, relevance_score: 0.9 }, { index: 0, relevance_score: 0.4 }],
    }), { status: 200 })
  ));
});

describe("rerank", () => {
  it("returns indices ordered by relevance with scores", async () => {
    const out = await rerank("who is the good shepherd?", ["a", "b", "c"], 2);
    expect(out).toEqual([{ index: 2, score: 0.9 }, { index: 0, score: 0.4 }]);
  });
});
