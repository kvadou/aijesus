import { AUTHORITY_TIER, type RawDoc, type SourceAdapter } from "@/corpus/types";

interface BookSpec { book: string; chapters: number; }

interface Config {
  sourceId: string;
  translation: "web" | "kjv" | "asv";
  books: BookSpec[];
}

interface ApiVerse { book_name: string; chapter: number; verse: number; text: string; }

export class BibleApiAdapter implements SourceAdapter {
  sourceId: string;
  constructor(private cfg: Config) {
    this.sourceId = cfg.sourceId;
  }

  async fetch(): Promise<RawDoc[]> {
    const docs: RawDoc[] = [];
    for (const spec of this.cfg.books) {
      const verses: RawDoc["verses"] = [];
      for (let ch = 1; ch <= spec.chapters; ch++) {
        const url = `https://bible-api.com/${encodeURIComponent(spec.book)}+${ch}?translation=${this.cfg.translation}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch failed ${spec.book} ${ch}: ${res.status}`);
        const data = (await res.json()) as { verses: ApiVerse[] };
        for (const v of data.verses) {
          verses.push({
            reference: `${v.book_name} ${v.chapter}:${v.verse}`,
            chapter: v.chapter,
            verse: v.verse,
            text: v.text.trim().replace(/\s+/g, " "),
          });
        }
      }
      docs.push({
        sourceId: this.cfg.sourceId,
        work: spec.book,
        book: spec.book,
        authorityTier: AUTHORITY_TIER.CANON,
        era: "1st century",
        license: "public domain",
        verses,
      });
    }
    return docs;
  }
}
