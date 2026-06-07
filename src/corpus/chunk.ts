import type { Chunk, RawDoc } from "@/corpus/types";

export function chunkDoc(doc: RawDoc, windowSize = 3): Chunk[] {
  const chunks: Chunk[] = [];
  for (let i = 0; i < doc.verses.length; i += windowSize) {
    const window = doc.verses.slice(i, i + windowSize);
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
  return chunks;
}
