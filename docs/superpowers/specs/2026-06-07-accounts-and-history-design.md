# Accounts & Persistent History — Design Spec

**Date:** 2026-06-07
**Status:** Approved for planning
**Governing document:** [PRIME_DIRECTIVE.md](../../../PRIME_DIRECTIVE.md)
**Builds on:** [chat MVP spec](2026-06-07-aijesus-chat-mvp-design.md)

---

## 1. Purpose

Let people keep their conversations with Jesus. Anonymous users get history saved
privately in their own browser. Anyone can create an account (email + password) to
store conversations durably and resume them across devices. This is the foundation
of an ongoing "relationship" with Jesus: a consistent, unchanging Jesus and the
user's own continuing journey.

## 2. Decisions (locked in brainstorming)

- **Memory model: continuity, persona frozen.** Jesus has full continuity *within*
  a conversation. He never adapts his theology, voice, or grounding to please a
  user. The relationship is the user's journey with a consistent Jesus, not a
  bespoke "personal Jesus." This directly upholds the Prime Directive's rule
  against a self-reinforcing loop / personal Jesus.
- **Auth: Supabase Auth, email + password** via `@supabase/ssr`. No hand-rolled
  password handling. Display name stored on a profile.
- **Anonymous history: localStorage only**, migrated into the account on signup.
  Nothing anonymous is stored server-side, so no consent prompt is required.
- **v1 relationship: saved + resumable conversations.** Cross-conversation memory
  (Jesus recalling a user from a different past chat) is a separate phase-2 spec.
- **Disclaimer shown once.** The "who I am / who I am not" notice appears
  prominently on first visit, is acknowledged once, then does not reappear. A small
  "What is this?" link remains available to re-read on demand.

## 3. Architecture

### 3.1 Auth (`@supabase/ssr`)
Supabase Auth with email + password. Session stored in httpOnly cookies via
`@supabase/ssr`. New env vars: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe). The existing
`SUPABASE_SERVICE_ROLE_KEY` stays server-only. Custom email/password forms (sign
up, log in, log out). No native dialogs.

Helper modules:
- `src/lib/supabase/server.ts` — request-scoped server client (reads session cookie).
- `src/lib/supabase/client.ts` — browser client.
- `src/lib/supabase/service.ts` — service-role client (renamed/relocated from the
  current `src/corpus/store.ts` `makeClient`, or kept and reused).

### 3.2 Schema — migration `supabase/migrations/0003_accounts.sql`, RLS-enforced
- `profiles` (id uuid PK → auth.users(id) on delete cascade, display_name text,
  disclaimer_acknowledged boolean default false, created_at timestamptz default
  now()). RLS: a user may select/update only their own row. A `handle_new_user`
  trigger on `auth.users` (security definer) inserts the profile row automatically
  when a user signs up (the standard Supabase pattern), so the app never has to
  create profiles itself.
- `conversations` (id uuid PK default gen_random_uuid(), user_id uuid → auth.users
  on delete cascade, title text, created_at, updated_at). RLS: user_id = auth.uid().
- `messages` (id bigint identity PK, conversation_id uuid → conversations on delete
  cascade, role text check in ('user','assistant'), content text, citations jsonb,
  created_at). RLS: conversation belongs to auth.uid() (via a policy that joins
  conversations).
- `corpus_chunks` unchanged. It is public reference data, accessed only by the
  service-role client, never user-scoped.

### 3.3 Two-client split in the chat route (the clean boundary)
- **Service-role client** → `corpus_chunks` retrieval (`searchCorpus`,
  `getPassage`). Public reference data; bypasses RLS by design.
- **User-scoped server client** (from the session cookie) → reads/writes
  `conversations` + `messages`. RLS enforces ownership; a user can never read or
  write another user's history, even through a bug, because the database refuses it.

### 3.4 Chat flow
- **Anonymous:** conversation state lives in `localStorage` (a `useLocalStorage`
  hook). The `/api/chat` route behaves exactly as today; nothing is persisted
  server-side. On reload, the last conversation is restored from localStorage.
- **Logged-in:** the client sends `conversationId` (omitted = new conversation).
  The route:
  1. Resolves the user from the session; 401 if the request claims a conversation
     but has no session.
  2. Runs the grounded agent (unchanged).
  3. Persists the user turn and the assistant reply (with citations) to `messages`
     under the conversation, via the user-scoped client. A new conversation is
     created and auto-titled from the first user message (first ~60 chars).
  4. Returns the reply plus the `conversationId`.
- **Sidebar (logged-in):** lists the user's conversations (title, updated_at),
  newest first. Clicking one loads its messages and resumes it. A "New conversation"
  action starts fresh.

### 3.5 Anonymous → account migration
On successful signup, if `localStorage` holds anonymous conversations, show a custom
prompt: "Save your past conversations to your account?" If accepted, POST them to
`/api/conversations/migrate`, which inserts them (and their messages) under the new
`user_id` via the user-scoped client. On success, clear the migrated entries from
localStorage. If declined, leave them local.

### 3.6 One-time disclaimer
- The prominent "who I am / who I am not" notice shows when `disclaimer_acknowledged`
  is false. For anonymous users this flag lives in localStorage; for logged-in users
  it lives on `profiles.disclaimer_acknowledged` (so it is once-per-account across
  devices). Acknowledging sets the flag.
- On signup migration, if the anonymous user had already acknowledged locally, set
  the profile flag true so they are not re-shown it.
- A persistent but unobtrusive "What is this?" link (header or footer) opens the
  same notice on demand. The current always-on footer `Disclosure` is replaced by
  this link plus the one-time notice.

### 3.7 Account deletion
A "Delete my account and all my data" action in account settings. Calls a route
that deletes the auth user (service-role `auth.admin.deleteUser`), which cascades to
`profiles`, `conversations`, and `messages` via `on delete cascade`. Right-to-delete,
consistent with the benevolent/transparent Prime Directive.

## 4. Privacy & Prime Directive

- Anonymous data never leaves the device. Account data is the user's own,
  RLS-isolated, and deletable on demand.
- Memory is continuity only; the persona is frozen and stays grounded and
  anti-sycophantic regardless of who is speaking. No per-user theology drift.
- Transparency: one-time honest disclosure that it is a reconstruction, re-readable
  on demand. Storage behavior (local vs account) stated plainly.

## 5. Out of scope (later specs)

- Cross-conversation memory ("Jesus remembers you across chats").
- Social login (Google/Apple).
- Custom password-reset email (Supabase default flow is sufficient).
- Conversation rename / search / export.

## 6. Testing

- Unit: conversation persistence helpers (create, append message, auto-title),
  migration mapping (localStorage shape → rows), disclaimer-state resolution
  (anon localStorage vs profile flag).
- RLS: an integration check that a user-scoped client cannot read another user's
  conversation (policy correctness).
- Auth flow: signup, login, logout, session persistence (manual + runtime-tested in
  the browser).
- Regression: anonymous chat still works end to end with no session.

## 7. Build order (one spec, phased)

1. Schema + RLS migration (`0003_accounts.sql`); apply to Supabase.
2. Supabase Auth wiring (`@supabase/ssr`, three client helpers, env vars) + signup /
   login / logout UI + profile creation.
3. Logged-in persistence: two-client split in `/api/chat`, conversation create /
   append / auto-title, conversation sidebar + resume.
4. Anonymous localStorage history + migration-on-signup endpoint and prompt.
5. One-time disclaimer (localStorage + profile flag) replacing the always-on footer;
   "What is this?" link.
6. Account deletion route + settings entry.
