import { describe, it, expect } from "vitest";
import { AUTHORITY_TIER, type RawDoc } from "@/corpus/types";

describe("authority tiers", () => {
  it("ranks canon above non-canonical", () => {
    expect(AUTHORITY_TIER.CANON).toBeLessThan(AUTHORITY_TIER.NON_CANONICAL);
  });

  it("RawDoc carries the fields the chunker needs", () => {
    const doc: RawDoc = {
      sourceId: "web", work: "Gospel of John", book: "John",
      authorityTier: AUTHORITY_TIER.CANON, era: "1st century", license: "public domain",
      verses: [{ reference: "John 3:16", chapter: 3, verse: 16, text: "For God so loved the world..." }],
    };
    expect(doc.verses[0].reference).toBe("John 3:16");
  });
});
