import { describe, it, expect } from "vitest";
import { chunkDoc } from "@/corpus/chunk";
import { AUTHORITY_TIER, type RawDoc } from "@/corpus/types";

const doc: RawDoc = {
  sourceId: "web", work: "John", book: "John",
  authorityTier: AUTHORITY_TIER.CANON, era: "1st century", license: "public domain",
  verses: [
    { reference: "John 3:16", chapter: 3, verse: 16, text: "a" },
    { reference: "John 3:17", chapter: 3, verse: 17, text: "b" },
    { reference: "John 3:18", chapter: 3, verse: 18, text: "c" },
    { reference: "John 3:19", chapter: 3, verse: 19, text: "d" },
  ],
};

describe("chunkDoc", () => {
  it("groups verses into windows and records the reference span", () => {
    const chunks = chunkDoc(doc, 3);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].reference).toBe("John 3:16-18");
    expect(chunks[0].verseStart).toBe(16);
    expect(chunks[0].verseEnd).toBe(18);
    expect(chunks[0].text).toBe("a b c");
    expect(chunks[1].reference).toBe("John 3:19");
  });

  it("never builds a window that crosses a chapter boundary", () => {
    const crossDoc: RawDoc = {
      sourceId: "web", work: "John", book: "John",
      authorityTier: AUTHORITY_TIER.CANON, era: "1st century", license: "public domain",
      verses: [
        { reference: "John 3:35", chapter: 3, verse: 35, text: "x" },
        { reference: "John 3:36", chapter: 3, verse: 36, text: "y" },
        { reference: "John 4:1", chapter: 4, verse: 1, text: "z" },
        { reference: "John 4:2", chapter: 4, verse: 2, text: "w" },
      ],
    };
    const chunks = chunkDoc(crossDoc, 3);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].reference).toBe("John 3:35-36");
    expect(chunks[0].chapter).toBe(3);
    expect(chunks[1].reference).toBe("John 4:1-2");
    expect(chunks[1].chapter).toBe(4);
  });
});
