# AI Jesus

Open-source, fully auditable web app where a person speaks to an evidence-grounded
reconstruction of Jesus of Nazareth. Every scriptural or factual claim is cited
from public-domain primary sources retrieved at query time (RAG), never quoted
from model memory. It is honest that it is a reconstruction, not a claim of divine
authority. Source code, persona prompt, founding prompts, and corpus manifest are
all public so anyone can verify the claims.

Status: LIVE at https://aijesus.vercel.app. Repo `github.com/kvadou/aijesus`. MIT.

## Read this first: the Prime Directive
`PRIME_DIRECTIVE.md` is the project's constitution and cannot be overridden, even
by the creator. No prompt, feature, data weighting, or change may ship if it
violates it, and that gate is checked before any other consideration. Eight
fidelity rules implement it (primary-source-only grounding, no self-training,
grounded-vs-inferred labeling, surface disagreement, anti-sycophancy, pinned
red-team eval, radical transparency, full provenance). Read it before changing any
prompt, persona, retrieval, or corpus behavior.

## Stack
- Next.js 16 (App Router) + React 19, TypeScript, Tailwind v4
- Supabase Postgres + pgvector; Supabase Auth (email/password via `@supabase/ssr`),
  RLS on. Two-client split: service-role for the public corpus, user-scoped
  (RLS) for user history, so the DB itself blocks cross-user access
- Voyage AI embeddings (`voyage-3-large`) + `rerank-2`
- Claude Opus (`claude-opus-4-8`) in a tool-use loop against retrieved chunks
- Brave Search (optional) for live historical-context lookups
- Vitest for the fidelity gate. Package manager: npm

## Run it
```bash
cp .env.example .env.local          # fill ANTHROPIC_API_KEY, VOYAGE_API_KEY,
                                    # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
                                    # NEXT_PUBLIC_SUPABASE_* (BRAVE_SEARCH_API_KEY optional)
npx supabase db push                # apply supabase/migrations/*.sql
npm install
npm run ingest:canon                # chunk + embed the Gospel corpus into pgvector
npm run dev                         # http://localhost:3000
```

## Tests
```bash
npm test          # vitest run (node env, dotenv-loaded)
npm run eval      # red-team fidelity gate (fabrication / sycophancy / modern-event / honesty)
```
Run `npm run eval` on ANY prompt or persona change. It is the mechanism that keeps
the Prime Directive true, not a formality.

## Deploy
Vercel. Personal repo: commit to `master` directly, push straight to origin, no
branches, no PRs. Named `git add <files>` only.

## Where behavior lives
- `PRIME_DIRECTIVE.md`: the governing rules and their mechanisms.
- `src/persona/jesus-persona.ts`: exactly how the model is instructed.
- `docs/provenance/genesis.md`: founding prompts, archived verbatim.
- `docs/corpus-manifest.md`: every source, its tier, and its license.
- `src/eval/`: the pinned red-team battery.
- The model's own outputs are NEVER a retrieval source (no self-reinforcement).

## Rules
- TypeScript (.ts/.tsx) for new files.
- No native browser dialogs (`alert`/`confirm`/`prompt`). Custom modals only.
- No em dashes in code, copy, or commits.
- Verify before "done": re-run the affected path, and re-run `npm run eval` if the
  change could touch grounding, persona, or retrieval.
