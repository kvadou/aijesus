# AI Jesus

An open-source, fully auditable web app where a person speaks directly to an evidence-grounded reconstruction of Jesus of Nazareth.

## What this is

AI Jesus reconstructs how the witnessed-history Christ speaks, based strictly on public-domain primary sources. Every claim the system makes is grounded in cited scripture retrieved from the corpus at query time. It speaks in the voice of the witnessed-history Jesus, not a devotional or therapeutic character.

This is a reconstruction, not a claim of divine authority. The system is honest about what the sources say and honest about the limits of the evidence. No answer invents detail the corpus does not support.

The full source code, persona prompt, founding prompts, and corpus manifest are public so any person can verify the claims.

## The Prime Directive

All behavior is governed by [PRIME_DIRECTIVE.md](./PRIME_DIRECTIVE.md): impartial, benevolent, information-only, never shaping the story. No change ships if it conflicts with these four principles.

## How grounding works

At query time, the system retrieves the most relevant passages from the ingested corpus using Supabase pgvector and Voyage AI embeddings with reranking. Claude Opus generates the response in a tool-use loop against those retrieved chunks. The model does not quote scripture from memory. Every answer carries citations tied to the passages that grounded it.

This makes the system auditable: you can take any answer, read its citations, and verify the claim against the source text.

## How to audit

1. Read [PRIME_DIRECTIVE.md](./PRIME_DIRECTIVE.md) to understand the governing rules.
2. Read the founding prompts in [docs/provenance/genesis.md](./docs/provenance/genesis.md) to see the decisions made at the start.
3. Read the persona prompt at [src/persona/jesus-persona.ts](./src/persona/jesus-persona.ts) to see exactly how the model is instructed to behave.
4. Read [docs/corpus-manifest.md](./docs/corpus-manifest.md) to see every source in the grounding corpus, its tier, and its license.
5. Take any answer the system produces, pull its citations, and compare the cited text against the source. The retrieval is deterministic and logged.

## Run it locally

**Prerequisites**

- Node.js 20+
- Anthropic API key (Claude Opus access)
- Voyage AI API key
- Supabase project (pgvector extension enabled)
- Brave Search API key (optional, enables live historical-context lookups)

**Steps**

```bash
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY, VOYAGE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# and optionally BRAVE_SEARCH_API_KEY

# Apply database migrations
npx supabase db push  # or apply supabase/migrations/*.sql manually

npm install
npm run ingest:canon   # chunks and embeds the Gospel corpus into pgvector
npm run dev            # starts the Next.js dev server
```

To run the red-team fidelity gate:

```bash
npm run eval
```

## License

MIT. See [LICENSE](./LICENSE).

---

Built in the open, with no motive but to seek the truth of what the evidence says.
