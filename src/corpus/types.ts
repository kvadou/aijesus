export const AUTHORITY_TIER = {
  CANON: 1,
  DEUTEROCANON: 2,
  HISTORICAL: 3,
  PSEUDEPIGRAPHA: 4,
  NON_CANONICAL: 5,
} as const;

export type AuthorityTier = (typeof AUTHORITY_TIER)[keyof typeof AUTHORITY_TIER];

export interface RawVerse {
  reference: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface RawDoc {
  sourceId: string;
  work: string;
  book: string;
  authorityTier: AuthorityTier;
  era: string;
  license: string;
  verses: RawVerse[];
}

export interface Chunk {
  sourceId: string;
  work: string;
  reference: string;
  book: string;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  authorityTier: AuthorityTier;
  era: string;
  license: string;
  text: string;
}

export interface Passage extends Chunk {
  id: number;
  score?: number;
}

export interface SourceAdapter {
  sourceId: string;
  fetch(): Promise<RawDoc[]>;
}
