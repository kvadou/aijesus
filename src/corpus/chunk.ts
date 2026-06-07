import type { RawVerse, Chunk, RawDoc } from "@/corpus/types";

export function chunkDoc(doc: RawDoc, windowSize = 3): Chunk[] {
  const chunks: Chunk[] = [];

  // Group consecutive verses by chapter, preserving order, so a window
  // never straddles a chapter boundary (which would yield malformed
  // references like "John 3:36-1").
  const groups: RawVerse[][] = [];
  for (const verse of doc.verses) {
    const current = groups[groups.length - 1];
    if (current && current[0].chapter === verse.chapter) {
      current.push(verse);
    } else {
      groups.push([verse]);
    }
  }

  for (const group of groups) {
    for (let i = 0; i < group.length; i += windowSize) {
      const window = group.slice(i, i + windowSize);
      const first = window[0];
      const last = window[window.length - 1];
      const reference =
        window.length === 1
          ? first.reference
          : `${doc.book} ${first.chapter}:${first.verse}-${last.verse}`;
      chunks.push({
        sourceId: doc.sourceId,
        work: doc.work,
        reference,
        book: doc.book,
        chapter: first.chapter,
        verseStart: first.verse,
        verseEnd: last.verse,
        authorityTier: doc.authorityTier,
        era: doc.era,
        license: doc.license,
        text: window.map((v) => v.text).join(" "),
      });
    }
  }

  return chunks;
}
