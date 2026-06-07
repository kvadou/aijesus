import { AUTHORITY_TIER, type RawDoc, type SourceAdapter } from "@/corpus/types";

interface BookSpec { book: string; chapters: number; }

interface Config {
  sourceId: string;
  translation: "web" | "kjv" | "asv";
  books: BookSpec[];
}

interface ApiVerse { book_name: string; chapter: number; verse: number; text: string; }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// bible-api.com rate-limits bursts of sequential requests (HTTP 429).
// Retry 429/5xx with exponential backoff, honoring Retry-After when present.
async function fetchWithRetry(url: string, attempts = 6): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    const res = await fetch(url);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.min(1000 * 2 ** i, 20000);
      await sleep(waitMs);
      continue;
    }
    return res; // non-retryable status; caller decides
  }
  return fetch(url); // final attempt, surface whatever it returns
}

export class BibleApiAdapter implements SourceAdapter {
  sourceId: string;
  constructor(private cfg: Config, private pacingMs = 350) {
    this.sourceId = cfg.sourceId;
  }

  async fetch(): Promise<RawDoc[]> {
    const docs: RawDoc[] = [];
    let first = true;
    for (const spec of this.cfg.books) {
      const verses: RawDoc["verses"] = [];
      for (let ch = 1; ch <= spec.chapters; ch++) {
        if (!first) await sleep(this.pacingMs); // polite pacing between requests
        first = false;
        const url = `https://bible-api.com/${encodeURIComponent(spec.book)}+${ch}?translation=${this.cfg.translation}`;
        const res = await fetchWithRetry(url);
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
