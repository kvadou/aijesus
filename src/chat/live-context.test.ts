import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchLiveContext } from "@/chat/live-context";

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "test");
  vi.stubGlobal("fetch", vi.fn(async () =>
    new Response(JSON.stringify({
      results: [{ title: "Quake hits region", url: "https://news.example/x", snippet: "A 6.1 quake...", published: "2026-06-06" }],
    }), { status: 200 })
  ));
});

describe("searchLiveContext", () => {
  it("returns dated, sourced facts", async () => {
    const facts = await searchLiveContext("earthquake today");
    expect(facts[0].title).toBe("Quake hits region");
    expect(facts[0].url).toContain("news.example");
    expect(facts[0].published).toBe("2026-06-06");
  });
});
