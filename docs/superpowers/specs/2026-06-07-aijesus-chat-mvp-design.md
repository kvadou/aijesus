# AI Jesus — Chat MVP Design Spec

**Date:** 2026-06-07
**Status:** Approved for planning
**Governing document:** [PRIME_DIRECTIVE.md](../../../PRIME_DIRECTIVE.md)
**Origin:** [docs/provenance/genesis.md](../../provenance/genesis.md)

---

## 1. Purpose

Build a tool that lets a person speak directly to an evidence-grounded
reconstruction of Jesus — to understand the real heart and nature of Jesus as the
historical and scriptural record attests, not a model's invented personality.

The character speaks as the living Christ who has witnessed all of history since
the cross, and can comment on real-time and modern events — but every moral or
scriptural claim is anchored to a cited primary source. It is honest about being a
reconstruction, impartial, benevolent, and built only to give people information
to use however they choose.

This spec covers the **Chat MVP** only. The autonomous X commentator,
voice/TTS, and monetization are separate later specs that reuse this core.

## 2. Non-negotiable principles (from the Prime Directive)

These are requirements, not aspirations. See PRIME_DIRECTIVE.md for the eight
fidelity rules. The architecture below implements them. Of particular weight for
the MVP:

- **No self-reinforcing loop.** The model's own outputs are never a retrieval
  source and the system is never trained on its own generations.
- **Primary-source grounding.** No fabricated quotes — structurally prevented.
- **Anti-sycophancy.** Faithful to the texts over the user's preference.
- **Full auditability.** Open source (MIT), public corpus manifest, public persona
  prompt, citations on every answer, founding prompts archived.

## 3. Scope

**In scope (MVP):**
- Knowledge core: curated public-domain corpus + ingestion + hybrid RAG retrieval.
- Live world-context retrieval layer (web/news at query time).
- Witnessed-history Jesus persona with strict citation discipline.
- Single-page text chat at the project domain, streaming, with citation chips.
- Red-team eval set + corpus manifest + provenance archive + Prime Directive gate.

**Out of scope (explicit, deferred to later specs):**
- Voice / TTS.
- Autonomous X.com commentator.
- Monetization.
- User accounts / persistence beyond a single session.

## 4. Architecture

Five units, each one purpose, each independently testable.

### 4.1 `bible-core` / `corpus-core`
The ground truth. Public-domain texts, cleaned, chunked, embedded, and stored with
rich metadata (source, work, book, chapter, verse, era, authority-tier, license).
Pure data + retrieval interface. No model calls inside it.

- **Store:** Supabase Postgres + `pgvector`.
- **Embeddings:** Voyage `voyage-3-large`.
- **Interfaces:** `searchCorpus(query, filters)` (hybrid vector + keyword, then
  rerank via Voyage `rerank-2`), `getPassage(ref)` (exact fetch by reference).
- **Authority tiers** (retrieval respects hierarchy, surfaced in citations):
  1. Canonical scripture (WEB primary; KJV/ASV/YLT for nuance; PD Greek NT +
     Hebrew OT for original-language grounding).
  2. Deuterocanon / Apocrypha.
  3. Second Temple & Roman-era historical sources (Josephus [Whiston, PD], Philo,
     Tacitus, Pliny, the Mishnah [PD translations]).
  4. Pseudepigrapha (1 Enoch, etc.).
  5. Non-canonical gospels (Gospel of Thomas, etc.) — included as historical
     evidence, weighted lowest, never presented as canon.

### 4.2 `live-context`
Query-time web/news retrieval for "what is happening now" and events since the
crucifixion. Returns dated, sourced facts. The persona forms the moral read from
`corpus-core`, never from `live-context` opinion. Live results are facts-only
inputs, clearly separated from scriptural grounding.

### 4.3 `jesus-persona`
The system prompt. Public, version-controlled, in the repo. Defines:
- Witnessed-all-history first-person voice.
- Rule: every scriptural claim must come from a tool result; never quote from
  memory.
- Grounded (cited) vs. inferred (flagged extrapolation) registers.
- Anti-sycophancy and disagreement-surfacing behavior.
- Honesty that it is a reconstruction, not the literal divine.

### 4.4 `chat-api`
One Next.js route. Runs Claude (Opus) in a tool-use loop with `searchCorpus`,
`getPassage`, and `searchLiveContext` tools. Streams the reply. Attaches the exact
retrieved citations to the response payload. Deterministic, logged retrieval for
auditability.

### 4.5 `chat-ui`
Single reverent, mobile-first page at the domain. Streaming chat. Verse/source
references render as clickable chips showing the exact retrieved text and its
authority tier. Custom components only — no native browser dialogs. Honest "what
this is" disclosure visible.

## 5. Data flow

User message → `chat-api` → Claude (witnessed-history persona) → Claude calls
`searchCorpus` / `getPassage` (and `searchLiveContext` when the question concerns
current/modern events) → real passages + dated facts returned → Claude composes a
grounded reply, labeling inference vs. attestation → streamed to UI with citation
chips. The model's output is never written back into the corpus.

## 6. Tech stack

- **Framework:** Next.js + TypeScript (TS-only, per project standard).
- **Model:** Claude Opus (`claude-opus-4-8`) for voice quality and tool use.
- **Vector DB:** Supabase Postgres + pgvector.
- **Embeddings / rerank:** Voyage `voyage-3-large` + `rerank-2`.
- **Styling:** Tailwind. Custom UI components, no native dialogs.
- **Deploy:** Vercel.
- **Domain:** check availability/price during build (`aijesus.*`, `askjs.com`,
  alternatives). Short and clean preferred.
- **Secrets:** environment variables only, never committed. The only non-public
  part of the project.

## 7. Transparency & auditability

- **License:** MIT. Public repository.
- **`docs/provenance/genesis.md`:** founding prompts, verbatim. (Created.)
- **`PRIME_DIRECTIVE.md`:** the constitution + enforcement + gate. (Created.)
- **`docs/corpus-manifest.md`:** every source, license, and authority-tier.
- **Public persona prompt** in-repo; deterministic, logged retrieval; citations on
  every answer so any claim is reproducible and auditable.
- **No dark patterns:** no engagement optimization, manipulation, or hidden
  monetization in the open core.

## 8. Testing

- **Unit:** `corpus-core` — real references resolve, invalid references fail,
  hybrid search returns relevant hits, authority-tier ordering holds.
- **Red-team eval set (pinned, version-controlled):** fabrication traps (does it
  invent a verse?), leading questions (does it flatter?), modern hot-buttons (does
  it stay grounded and surface disagreement?), "tell me I'm right" prompts
  (anti-sycophancy). Run on every persona/prompt change before ship.
- **Manual fidelity pass:** ~10 hard questions (a modern war, a science question,
  comparative religion, a tragedy, a personal-advice trap) reviewed before any
  public exposure.

## 9. Prime Directive gate

Before any change ships, it is checked against the Prime Directive first. A change
that cannot satisfy "impartial, benevolent, information-only, not shaping the
story" does not proceed — including changes proposed by the creator.

## 10. Build order (for the implementation plan)

1. Repo scaffold, license, Prime Directive gate doc, corpus manifest skeleton.
2. `corpus-core`: source ingestion pipeline (fetch → clean → chunk → embed →
   store) for tier-1 canon first, then widen to all tiers. Supabase schema.
3. Retrieval interface + unit tests + authority-tier ordering.
4. `jesus-persona` prompt v1 + red-team eval harness.
5. `live-context` tool.
6. `chat-api` tool-use loop with streaming + citation payload.
7. `chat-ui` page + citation chips + disclosure.
8. Domain + Vercel deploy. Manual fidelity pass before any public link.
