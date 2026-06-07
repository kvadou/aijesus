import { describe, it, expect, vi } from "vitest";
import { TOOL_DEFS, dispatchTool } from "@/chat/tools";
import * as retrieve from "@/corpus/retrieve";
import * as live from "@/chat/live-context";

describe("tools", () => {
  it("exposes the three tools to the model", () => {
    expect(TOOL_DEFS.map((t) => t.name).sort()).toEqual(["get_passage", "search_corpus", "search_live_context"]);
  });
  it("dispatches search_corpus to retrieval", async () => {
    vi.spyOn(retrieve, "searchCorpus").mockResolvedValue([
      { id: 1, sourceId: "web", work: "John", reference: "John 10:11", book: "John", chapter: 10, verseStart: 11, verseEnd: 11, authorityTier: 1, era: "1st century", license: "public domain", text: "I am the good shepherd", score: 0.9 },
    ]);
    const out = await dispatchTool({} as any, "search_corpus", { query: "good shepherd" });
    expect(out).toContain("John 10:11");
    expect(out).toContain("I am the good shepherd");
  });
  it("dispatches search_live_context", async () => {
    vi.spyOn(live, "searchLiveContext").mockResolvedValue([
      { title: "T", url: "https://e/x", snippet: "s", published: "2026-06-06" },
    ]);
    const out = await dispatchTool({} as any, "search_live_context", { query: "today" });
    expect(out).toContain("https://e/x");
  });
});
