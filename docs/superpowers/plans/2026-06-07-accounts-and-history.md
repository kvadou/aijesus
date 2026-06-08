# Accounts & Persistent History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase email+password accounts, RLS-isolated persistent conversations for logged-in users, private localStorage history for anonymous users with migration on signup, a one-time disclaimer, and account deletion.

**Architecture:** Supabase Auth via `@supabase/ssr` (httpOnly cookie sessions, refreshed by Next middleware). A new RLS-enforced schema (`profiles`, `conversations`, `messages`) keyed to `auth.users`. The chat route uses two Supabase clients: the existing service-role client for the public `corpus_chunks`, and a request-scoped user-scoped client for history so the database itself blocks cross-user access. Anonymous history lives only in the browser and migrates into the account on signup.

**Tech Stack:** Next.js App Router · TypeScript · `@supabase/ssr` · `@supabase/supabase-js` · Supabase Auth + Postgres RLS · Vitest.

**Spec:** [docs/superpowers/specs/2026-06-07-accounts-and-history-design.md](../specs/2026-06-07-accounts-and-history-design.md)

**Important for implementers:** Before writing any `@supabase/ssr` code, invoke the `supabase` skill to confirm the current `createServerClient` / `createBrowserClient` cookie API and the middleware session-refresh pattern. The code below uses the stable `getAll`/`setAll` cookie interface; adjust only if the skill shows a newer API.

---

## File Structure

```
middleware.ts                              # Next root middleware: refresh session
src/lib/supabase/service.ts                # service-role client (public corpus)
src/lib/supabase/server.ts                 # request-scoped user-scoped server client
src/lib/supabase/client.ts                 # browser client
src/lib/supabase/middleware.ts             # updateSession() helper
src/lib/conversations.ts                   # persistence: create/append/list/load/title
src/lib/conversations.test.ts
src/lib/local-history.ts                   # anon localStorage read/write/clear
src/lib/local-history.test.ts
supabase/migrations/0003_accounts.sql      # profiles/conversations/messages + RLS
src/app/api/chat/route.ts                  # MODIFY: persist for logged-in users
src/app/api/conversations/route.ts         # GET list
src/app/api/conversations/[id]/route.ts    # GET one conversation's messages
src/app/api/conversations/migrate/route.ts # POST migrate anon -> account
src/app/api/account/route.ts               # DELETE account + all data
src/components/auth/AuthForm.tsx           # signup / login form
src/components/auth/UserMenu.tsx           # logged-in menu (name, logout, delete)
src/components/Sidebar.tsx                 # conversation list + new chat
src/components/Disclaimer.tsx              # one-time notice + "What is this?"
src/app/page.tsx                           # MODIFY: auth state, sidebar, disclaimer, persistence wiring
src/corpus/store.ts                        # MODIFY: re-export service client from new location
```

---

## Phase 1 — Schema + RLS

### Task 1: accounts schema migration

**Files:** Create `supabase/migrations/0003_accounts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- profiles: one row per auth user, created automatically by trigger
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  disclaimer_acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists conversations_user_idx on conversations (user_id, updated_at desc);

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- auto-create a profile when a user signs up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', null));
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own conversations" on conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own messages" on messages for all
  using (exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()));
```

- [ ] **Step 2: Apply the migration**

This network has no IPv6; use the IPv4 pooler host `aws-1-us-east-1`. From the project root:

```bash
PW="$(cat .supabase-db-password.txt)"
supabase db push --db-url "postgresql://postgres.hakvxidkzajgkrqbnzhz:${PW}@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```

- [ ] **Step 3: Verify**

```bash
PW="$(cat .supabase-db-password.txt)"
psql "postgresql://postgres.hakvxidkzajgkrqbnzhz:${PW}@aws-1-us-east-1.pooler.supabase.com:5432/postgres" \
  -tAc "select count(*) from profiles; select count(*) from conversations; select count(*) from messages;
        select tablename from pg_policies where schemaname='public' order by tablename;"
```
Expected: three `0` counts; policy rows listed for conversations, messages, profiles.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_accounts.sql
git commit -m "feat: accounts schema (profiles/conversations/messages) with RLS + new-user trigger"
```

---

## Phase 2 — Supabase Auth wiring + UI

### Task 2: env vars + Supabase client helpers

**Files:** Create `src/lib/supabase/service.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/middleware.ts`; modify `src/env.ts`; add to `.env.local`

- [ ] **Step 1: Add client env vars to `.env.local`** (values: the same SUPABASE_URL, and the anon/publishable key from Supabase dashboard → Project Settings → API). Also add them to Vercel later.

```
NEXT_PUBLIC_SUPABASE_URL=https://hakvxidkzajgkrqbnzhz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key>
```

Fetch the anon key via CLI without printing it into chat:
```bash
supabase projects api-keys --project-ref hakvxidkzajgkrqbnzhz -o env | grep -i anon
```

- [ ] **Step 2: Install `@supabase/ssr`**

```bash
npm install @supabase/ssr
```

- [ ] **Step 3: `src/lib/supabase/service.ts`** (service-role; move the existing makeClient here)

```typescript
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Full access, bypasses RLS. Use ONLY for public reference
// data (corpus_chunks) and admin operations (account deletion). Never expose to
// the browser.
export function serviceClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 4: `src/lib/supabase/server.ts`** (request-scoped, user session via cookies)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// User-scoped server client. Reads the session from cookies, so all queries run as
// the logged-in user and RLS applies. Use for conversations/messages/profiles.
export async function userServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component; safe to ignore (middleware refreshes)
          }
        },
      },
    },
  );
}
```

- [ ] **Step 5: `src/lib/supabase/client.ts`** (browser)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 6: `src/lib/supabase/middleware.ts`** (session refresh helper)

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser(); // refreshes the token cookie
  return response;
}
```

- [ ] **Step 7: Root `middleware.ts`**

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 8: Point `src/corpus/store.ts` at the new service client** (keep `makeClient` working for existing imports)

Replace the body of `makeClient` so it delegates, avoiding duplicate client code:

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import { serviceClient } from "@/lib/supabase/service";
import type { Chunk } from "@/corpus/types";

export function makeClient(): SupabaseClient {
  return serviceClient();
}
```
(Keep `insertChunks` exactly as it is.)

- [ ] **Step 9: Verify build + tests**

Run: `npx tsc --noEmit` (clean) and `npx vitest run` (all green — existing tests untouched).

- [ ] **Step 10: Commit**

```bash
git add src/lib/supabase package.json package-lock.json src/corpus/store.ts middleware.ts
git commit -m "feat: Supabase SSR auth client helpers + session-refresh middleware"
```

### Task 3: auth UI (signup / login / logout)

**Files:** Create `src/components/auth/AuthForm.tsx`, `src/components/auth/UserMenu.tsx`

- [ ] **Step 1: `AuthForm.tsx`** — custom email+password form (no native dialogs). Supports a `mode` of "login" | "signup".

```tsx
"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = browserClient();
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName || null } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onAuthed();
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-serif text-xl text-stone-800">
        {mode === "signup" ? "Create an account" : "Welcome back"}
      </h2>
      {mode === "signup" && (
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Name (optional)"
          className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2"
        />
      )}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        className="mb-3 w-full rounded-lg border border-stone-200 px-3 py-2"
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !email || !password}
        className="w-full rounded-lg bg-stone-800 py-2 text-stone-50 disabled:opacity-50"
      >
        {busy ? "…" : mode === "signup" ? "Sign up" : "Log in"}
      </button>
      <button
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        className="mt-3 w-full text-sm text-stone-500 hover:text-stone-700"
      >
        {mode === "signup" ? "Have an account? Log in" : "New here? Create an account"}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: `UserMenu.tsx`** — shows display name, logout, delete-account entry.

```tsx
"use client";
import { browserClient } from "@/lib/supabase/client";

export function UserMenu({
  name,
  onSignedOut,
  onDelete,
}: {
  name: string;
  onSignedOut: () => void;
  onDelete: () => void;
}) {
  async function logout() {
    await browserClient().auth.signOut();
    onSignedOut();
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-stone-600">{name}</span>
      <button onClick={logout} className="text-stone-500 hover:text-stone-800">
        Log out
      </button>
      <button onClick={onDelete} className="text-red-500 hover:text-red-700">
        Delete account
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit` (clean).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth
git commit -m "feat: email+password auth form and user menu components"
```

---

## Phase 3 — Persistence for logged-in users

### Task 4: conversation persistence helpers

**Files:** Create `src/lib/conversations.ts`, `src/lib/conversations.test.ts`

- [ ] **Step 1: Write the failing test** (Supabase client mocked)

```typescript
import { describe, it, expect, vi } from "vitest";
import { autoTitle, appendMessage } from "@/lib/conversations";

describe("autoTitle", () => {
  it("uses the first ~60 chars of the first user message", () => {
    expect(autoTitle("Who is the good shepherd and what did he teach about the lost sheep parable?"))
      .toBe("Who is the good shepherd and what did he teach about the lost…");
  });
  it("returns the whole string when short", () => {
    expect(autoTitle("Hello")).toBe("Hello");
  });
});

describe("appendMessage", () => {
  it("inserts a row mapped to the conversation with citations", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: vi.fn(() => ({ insert })) } as any;
    await appendMessage(client, "conv-1", "assistant", "I am the good shepherd", [
      { reference: "John 10:11", sourceId: "web", tier: 1, text: "I am the good shepherd" },
    ]);
    expect(client.from).toHaveBeenCalledWith("messages");
    const row = insert.mock.calls[0][0];
    expect(row.conversation_id).toBe("conv-1");
    expect(row.role).toBe("assistant");
    expect(row.citations[0].reference).toBe("John 10:11");
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/lib/conversations.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/lib/conversations.ts`**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Citation } from "@/chat/agent";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

export function autoTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? clean.slice(0, 60).trimEnd() + "…" : clean;
}

export async function createConversation(
  client: SupabaseClient,
  userId: string,
  title: string,
): Promise<string> {
  const { data, error } = await client
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function appendMessage(
  client: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[],
): Promise<void> {
  const { error } = await client.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    citations,
  });
  if (error) throw new Error(error.message);
}

export async function touchConversation(client: SupabaseClient, conversationId: string): Promise<void> {
  await client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function listConversations(client: SupabaseClient): Promise<ConversationSummary[]> {
  const { data, error } = await client
    .from("conversations")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

export async function loadMessages(client: SupabaseClient, conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await client
    .from("messages")
    .select("role,content,citations")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ role: r.role, content: r.content, citations: r.citations ?? [] }));
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/lib/conversations.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/conversations.ts src/lib/conversations.test.ts
git commit -m "feat: conversation persistence helpers (create/append/list/load/title)"
```

### Task 5: persist turns in the chat route for logged-in users

**Files:** Modify `src/app/api/chat/route.ts`

- [ ] **Step 1: Read the current route**, then add persistence. After the rate-limit + payload checks and after `runAgent` returns `result`, persist when a session exists. Add imports:

```typescript
import { userServerClient } from "@/lib/supabase/server";
import { createConversation, appendMessage, touchConversation, autoTitle } from "@/lib/conversations";
```

Accept an optional `conversationId` in the body type and persist. Replace the success path so it reads:

```typescript
  const { messages, conversationId } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    conversationId?: string;
  };
  // ... existing validation (array/empty, length, per-message, total) unchanged ...

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const db = makeClient(); // service-role: public corpus
    const result = await runAgent(
      anthropic,
      db,
      messages.map((m) => ({ role: m.role, content: m.content })),
    );

    // Persist only for logged-in users; anonymous users keep history in the browser.
    let convId = conversationId ?? null;
    const supabase = await userServerClient();
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (!convId) {
        convId = await createConversation(supabase, auth.user.id, autoTitle(lastUser?.content ?? "New conversation"));
      }
      if (lastUser) await appendMessage(supabase, convId, "user", lastUser.content, []);
      await appendMessage(supabase, convId, "assistant", result.text, result.citations);
      await touchConversation(supabase, convId);
    }

    return NextResponse.json({ ...result, conversationId: convId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` (clean), `npm run build` (succeeds), `npx vitest run` (all green; the agent test is unaffected).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat: persist conversation turns for logged-in users (RLS-scoped)"
```

### Task 6: conversation list + load API routes

**Files:** Create `src/app/api/conversations/route.ts`, `src/app/api/conversations/[id]/route.ts`

- [ ] **Step 1: `src/app/api/conversations/route.ts`** (GET list)

```typescript
import { NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { listConversations } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ conversations: [] });
  return NextResponse.json({ conversations: await listConversations(supabase) });
}
```

- [ ] **Step 2: `src/app/api/conversations/[id]/route.ts`** (GET one conversation's messages)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { loadMessages } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // RLS ensures only the owner's messages return; a non-owner gets an empty list.
  return NextResponse.json({ messages: await loadMessages(supabase, id) });
}
```

- [ ] **Step 3: Verify** `npx tsc --noEmit` clean, `npm run build` succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/conversations
git commit -m "feat: list conversations + load conversation messages API (RLS-scoped)"
```

### Task 7: conversation sidebar

**Files:** Create `src/components/Sidebar.tsx`

- [ ] **Step 1: `Sidebar.tsx`**

```tsx
"use client";
import type { ConversationSummary } from "@/lib/conversations";

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200 bg-stone-100/60 p-3">
      <button
        onClick={onNew}
        className="mb-3 rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-50"
      >
        New conversation
      </button>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`mb-1 block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
              c.id === activeId ? "bg-white text-stone-800 shadow-sm" : "text-stone-600 hover:bg-white/70"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: conversation sidebar component"
```

---

## Phase 4 — Anonymous history + migration

### Task 8: localStorage history helper

**Files:** Create `src/lib/local-history.ts`, `src/lib/local-history.test.ts`

- [ ] **Step 1: Write the failing test** (jsdom-free; inject a fake storage)

```typescript
import { describe, it, expect } from "vitest";
import { readLocal, writeLocal, clearLocal, type LocalConversation } from "@/lib/local-history";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  } as Storage;
}

describe("local-history", () => {
  it("round-trips conversations", () => {
    const s = fakeStorage();
    const convs: LocalConversation[] = [
      { id: "local-1", title: "Hi", messages: [{ role: "user", content: "Hi", citations: [] }] },
    ];
    writeLocal(s, convs);
    expect(readLocal(s)).toEqual(convs);
  });
  it("returns [] when empty or corrupt", () => {
    const s = fakeStorage();
    expect(readLocal(s)).toEqual([]);
    s.setItem("aijesus.history", "not json");
    expect(readLocal(s)).toEqual([]);
  });
  it("clears", () => {
    const s = fakeStorage();
    writeLocal(s, [{ id: "x", title: "t", messages: [] }]);
    clearLocal(s);
    expect(readLocal(s)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it, expect failure**

Run: `npx vitest run src/lib/local-history.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write `src/lib/local-history.ts`**

```typescript
import type { Citation } from "@/chat/agent";

export interface LocalMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}
export interface LocalConversation {
  id: string;
  title: string;
  messages: LocalMessage[];
}

const KEY = "aijesus.history";

export function readLocal(storage: Storage): LocalConversation[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalConversation[]) : [];
  } catch {
    return [];
  }
}

export function writeLocal(storage: Storage, conversations: LocalConversation[]): void {
  storage.setItem(KEY, JSON.stringify(conversations));
}

export function clearLocal(storage: Storage): void {
  storage.removeItem(KEY);
}
```

- [ ] **Step 4: Run the test, expect pass**

Run: `npx vitest run src/lib/local-history.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/local-history.ts src/lib/local-history.test.ts
git commit -m "feat: anonymous localStorage history helper"
```

### Task 9: migration endpoint

**Files:** Create `src/app/api/conversations/migrate/route.ts`

- [ ] **Step 1: Write the route** — accepts the local conversations, inserts them under the user.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { createConversation, appendMessage } from "@/lib/conversations";
import type { LocalConversation } from "@/lib/local-history";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { conversations } = (await req.json()) as { conversations: LocalConversation[] };
  if (!Array.isArray(conversations)) {
    return NextResponse.json({ error: "conversations required" }, { status: 400 });
  }
  if (conversations.length > 100) {
    return NextResponse.json({ error: "too many conversations" }, { status: 400 });
  }

  let migrated = 0;
  for (const conv of conversations) {
    const title = conv.title?.slice(0, 200) || "Imported conversation";
    const id = await createConversation(supabase, auth.user.id, title);
    for (const m of conv.messages ?? []) {
      if (m.role !== "user" && m.role !== "assistant") continue;
      if (typeof m.content !== "string" || m.content.length > 8000) continue;
      await appendMessage(supabase, id, m.role, m.content, Array.isArray(m.citations) ? m.citations : []);
    }
    migrated++;
  }
  return NextResponse.json({ migrated });
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean, `npm run build` succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/conversations/migrate/route.ts
git commit -m "feat: migrate anonymous localStorage conversations into a new account"
```

---

## Phase 5 — One-time disclaimer

### Task 10: Disclaimer component + disclaimer state

**Files:** Create `src/components/Disclaimer.tsx`; delete usage of the always-on `Disclosure` in `page.tsx` (handled in Task 12)

- [ ] **Step 1: `Disclaimer.tsx`** — a one-time modal-style notice plus a re-openable inline mode.

```tsx
"use client";

const TEXT =
  "I am an evidence-grounded reconstruction built from public-domain scripture and historical texts. I am not the literal divine person. Every claim I make is cited so you can check it against the source yourself. This project is open source and fully auditable.";

export function Disclaimer({
  open,
  onAcknowledge,
  onClose,
  firstTime,
}: {
  open: boolean;
  onAcknowledge: () => void;
  onClose: () => void;
  firstTime: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-3 font-serif text-xl text-stone-800">Who I am, and who I am not</h2>
        <p className="mb-5 text-sm leading-relaxed text-stone-600">{TEXT}</p>
        <button
          onClick={firstTime ? onAcknowledge : onClose}
          className="w-full rounded-lg bg-stone-800 py-2 text-stone-50"
        >
          {firstTime ? "I understand" : "Close"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/Disclaimer.tsx
git commit -m "feat: one-time disclaimer notice component"
```

---

## Phase 6 — Account deletion + page integration

### Task 11: account deletion route

**Files:** Create `src/app/api/account/route.ts`

- [ ] **Step 1: Write the route** — deletes the auth user (service-role admin), cascade removes all data.

```typescript
import { NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function DELETE() {
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Service-role admin delete; cascades to profiles/conversations/messages.
  const admin = serviceClient();
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ deleted: true });
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit` clean, `npm run build` succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/account/route.ts
git commit -m "feat: account deletion route (cascades to all user data)"
```

### Task 12: wire everything into the page

**Files:** Modify `src/app/page.tsx`; remove the always-on `Disclosure` import/usage

This is the integration task. The page becomes auth-aware and orchestrates anon vs logged-in flows, the sidebar, persistence, migration, and the one-time disclaimer.

- [ ] **Step 1: Rewrite `src/app/page.tsx`** with the full integration:

```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { ChatMessage, type UiMessage } from "@/components/ChatMessage";
import { Thinking } from "@/components/Thinking";
import { Sidebar } from "@/components/Sidebar";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { Disclaimer } from "@/components/Disclaimer";
import { browserClient } from "@/lib/supabase/client";
import { readLocal, writeLocal, clearLocal, type LocalConversation } from "@/lib/local-history";
import type { ConversationSummary } from "@/lib/conversations";

const ACK_KEY = "aijesus.disclaimer_ack";

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerFirstTime, setDisclaimerFirstTime] = useState(true);

  // Resolve auth + disclaimer state on mount.
  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    const supabase = browserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const name = (data.user.user_metadata?.display_name as string) || data.user.email || "friend";
        setUser({ id: data.user.id, name });
        const { data: profile } = await supabase.from("profiles").select("disclaimer_acknowledged").single();
        if (!profile?.disclaimer_acknowledged) {
          setDisclaimerFirstTime(true);
          setDisclaimerOpen(true);
        }
        await refreshConversations();
        // offer migration if local history exists
        const local = readLocal(window.localStorage);
        if (local.length > 0) {
          await fetch("/api/conversations/migrate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ conversations: local }),
          });
          clearLocal(window.localStorage);
          await refreshConversations();
        }
      } else {
        // anonymous: restore last local conversation + disclaimer-once via localStorage
        const local = readLocal(window.localStorage);
        if (local[0]) {
          setMessages(local[0].messages);
          setConversationId(local[0].id);
        }
        if (window.localStorage.getItem(ACK_KEY) !== "1") {
          setDisclaimerFirstTime(true);
          setDisclaimerOpen(true);
        }
      }
    });
  }, [refreshConversations]);

  function acknowledgeDisclaimer() {
    setDisclaimerOpen(false);
    if (user) {
      browserClient().from("profiles").update({ disclaimer_acknowledged: true }).eq("id", user.id).then(() => {});
    } else {
      window.localStorage.setItem(ACK_KEY, "1");
    }
  }

  async function loadConversation(id: string) {
    setConversationId(id);
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: UiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        }),
      });
      const data = await res.json();
      const content = data.text ?? data.error ?? "Something went wrong. Try again.";
      const updated: UiMessage[] = [...next, { role: "assistant", content, citations: data.citations ?? [] }];
      setMessages(updated);
      if (data.conversationId) {
        setConversationId(data.conversationId);
        if (user) refreshConversations();
      }
      // anonymous: persist to localStorage
      if (!user) {
        const id = conversationId ?? `local-${updated[0].content.slice(0, 8)}-${updated.length}`;
        const title = updated[0].content.slice(0, 60);
        const others = readLocal(window.localStorage).filter((c) => c.id !== id);
        writeLocal(window.localStorage, [
          { id, title, messages: updated.map((m) => ({ role: m.role, content: m.content, citations: m.citations ?? [] })) },
          ...others,
        ]);
        setConversationId(id);
      }
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", content: "Something failed. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    await fetch("/api/account", { method: "DELETE" });
    setUser(null);
    setConversations([]);
    newConversation();
  }

  return (
    <div className="flex h-screen bg-stone-50">
      {user && (
        <Sidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={loadConversation}
          onNew={newConversation}
        />
      )}
      <main className="mx-auto flex h-full max-w-2xl flex-1 flex-col">
        <header className="flex items-center justify-between px-4 pt-6 pb-4">
          <h1 className="font-serif text-2xl text-stone-800">Speak with Jesus</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => { setDisclaimerFirstTime(false); setDisclaimerOpen(true); }} className="text-xs text-stone-400 hover:text-stone-600">
              What is this?
            </button>
            {user ? (
              <UserMenu name={user.name} onSignedOut={() => { setUser(null); newConversation(); }} onDelete={deleteAccount} />
            ) : (
              <button onClick={() => setShowAuth(true)} className="text-sm text-stone-600 hover:text-stone-900">
                Log in / Sign up
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4">
          {messages.length === 0 && (
            <p className="mt-16 text-center text-stone-400">Ask anything. Every answer is grounded in cited text.</p>
          )}
          {messages.map((m, i) => <ChatMessage key={i} m={m} />)}
          {loading && <Thinking />}
        </div>

        <div className="sticky bottom-0 bg-stone-50 px-4 pb-4 pt-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Jesus…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-stone-400 focus:outline-none"
            />
            <button onClick={send} disabled={loading} className="rounded-xl bg-stone-800 px-5 py-3 text-stone-50 disabled:opacity-50">
              Send
            </button>
          </div>
        </div>
      </main>

      {showAuth && !user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setShowAuth(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthForm onAuthed={() => { setShowAuth(false); window.location.reload(); }} />
          </div>
        </div>
      )}

      <Disclaimer
        open={disclaimerOpen}
        firstTime={disclaimerFirstTime}
        onAcknowledge={acknowledgeDisclaimer}
        onClose={() => setDisclaimerOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Remove the now-unused `Disclosure` import** if present (the one-time `Disclaimer` replaces the always-on footer). Leave `src/components/Disclosure.tsx` file in place but unused, or delete it and its import — your choice; do not leave a dangling import.

- [ ] **Step 3: Verify** `npx tsc --noEmit` clean, `npm run build` succeeds, `npx vitest run` all green.

- [ ] **Step 4: Browser-verify the full flow** (dev server, `env -u SUPABASE_URL npm run dev`): anonymous chat persists across reload; one-time disclaimer shows once then not again; sign up → disclaimer carries over (not re-shown), local history migrates, conversation appears in sidebar; log out / log in resumes conversations; "What is this?" reopens the notice. Tag `[runtime-tested]`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: integrate auth, sidebar, persistence, migration, one-time disclaimer into chat page [runtime-tested]"
```

### Task 13: deploy env + ship

**Files:** none (config + deploy)

- [ ] **Step 1: Add the two client env vars to Vercel production**

```bash
SCOPE="dougkvamme-gmailcoms-projects"
printf '%s' "https://hakvxidkzajgkrqbnzhz.supabase.co" | npx vercel env add NEXT_PUBLIC_SUPABASE_URL production --scope "$SCOPE" --force
# anon key (fetch without echoing into chat):
supabase projects api-keys --project-ref hakvxidkzajgkrqbnzhz -o env | grep -i anon | cut -d= -f2- | tr -d '"' | npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --scope "$SCOPE" --force
```

- [ ] **Step 2: Confirm Supabase Auth settings** — in the Supabase dashboard, Authentication → Providers → Email is enabled; set the Site URL to the production URL so confirmation/redirect links work. For an MVP you may disable email confirmation (Authentication → Providers → Email → "Confirm email" off) so signup is immediate; note this tradeoff to Doug.

- [ ] **Step 3: Deploy**

```bash
npx vercel deploy --prod --yes --scope dougkvamme-gmailcoms-projects
```

- [ ] **Step 4: Prod-verify** — sign up on the live URL, send a message, reload, confirm the conversation persists and appears in the sidebar; log out and back in; confirm anonymous still works in a private window. Tag `[prod-verified]`.

---

## Self-Review

**Spec coverage:**
- Auth (Supabase email+password, @supabase/ssr) → Tasks 2, 3. ✓
- Schema + RLS (profiles/conversations/messages, new-user trigger) → Task 1. ✓
- Two-client split (service-role corpus, user-scoped history) → Tasks 2, 5. ✓
- Logged-in persistence + auto-title + resume → Tasks 4, 5, 6, 7. ✓
- Anonymous localStorage + migration on signup → Tasks 8, 9, 12. ✓
- One-time disclaimer (localStorage anon, profile flag logged-in, "What is this?") → Tasks 10, 12. ✓
- Account deletion (cascade) → Task 11. ✓
- Memory = continuity within a conversation, persona frozen → enforced by design: the route only sends the current conversation's messages to the agent and never writes outputs back to the corpus; no cross-conversation memory is loaded. ✓
- Out of scope (cross-conversation memory, social login) → not present. ✓

**Placeholder scan:** No TBD/TODO. Every code step has full code. The only deferred specifics are the anon key value (fetched at build time, not committed) and Supabase dashboard auth settings (Task 13 Step 2), which are runtime config, not code.

**Type consistency:** `ConversationSummary`, `StoredMessage`/`LocalConversation`/`LocalMessage`, `Citation` (reused from `@/chat/agent`) are defined once and used consistently. Helper signatures `createConversation(client,userId,title)`, `appendMessage(client,convId,role,content,citations)`, `listConversations(client)`, `loadMessages(client,convId)`, `autoTitle(str)` match across Tasks 4, 5, 6, 9. The chat route returns `{...result, conversationId}` and the page reads `data.conversationId` — consistent.
