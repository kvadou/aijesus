# Handoff: /impeccable design review + responsive/mobile + input-contrast fix

**For:** a fresh session (context cleared). Read this top to bottom before starting.
**Date:** 2026-06-07
**Repo:** `/Users/dougkvamme/Projects/aijesus` (also github.com/kvadou/aijesus, public)
**Live:** https://aijesus.vercel.app
**Branch to start from:** `main` (everything is merged + deployed + prod-verified). Create a new branch `build/impeccable` before touching code.

---

## What this app is (90-second orientation)

"AI Jesus" / "Speak with Jesus": an open-source, fully-auditable, scripture-grounded chat. Users ask anything; a witnessed-history first-person Jesus answers, with every claim cited from a public-domain corpus (four Gospels, WEB) via RAG. Governed by `PRIME_DIRECTIVE.md` (impartial, benevolent, information-only, never shaping the story). Already has: chat, accounts (Supabase Auth email+password), anonymous localStorage history that migrates on signup, conversation sidebar + resume, one-time disclaimer, account deletion. All RLS-isolated, eval gate 5/5, browser + prod verified.

**Stack:** Next.js (App Router) + TypeScript, Tailwind v4, Vitest. Supabase (pgvector + Auth). Claude Opus. Deployed on Vercel.

**Key UI files (this is what you'll touch):**
- `src/app/page.tsx` — the whole chat page: header, sidebar, chat stream, input bar, auth modal, disclaimer. **This is the main layout file for responsive work.**
- `src/components/auth/AuthForm.tsx` — signup/login form (HAS THE CONTRAST BUG, see below).
- `src/components/auth/UserMenu.tsx` — logged-in header menu (name / log out / delete).
- `src/components/Sidebar.tsx` — conversation list, fixed `w-64`, **does not collapse on mobile (responsive gap).**
- `src/components/ChatMessage.tsx` — message bubbles + citation chips container.
- `src/components/CitationChip.tsx` — expandable citation popover (absolute-positioned; check mobile overflow).
- `src/components/Thinking.tsx` — "Searching the scriptures…" loading indicator (good, keep).
- `src/components/Disclaimer.tsx` — one-time modal.
- `src/app/layout.tsx`, `src/app/globals.css` — root + Tailwind entry.

**Do NOT break** the verified flows: auth, anon→account migration, conversation persistence/resume, RLS, the chat tool-use loop. This is a visual/responsive pass, not a logic rewrite. Keep all existing props/handlers.

---

## WORK ITEM 1 (P0, do first, ~10 min): input text + placeholder are nearly invisible

**Symptom (from screenshots):** On the signup card, the typed text in the Name field shows as ghost-gray (barely readable), and the Email/Password placeholders are almost invisible.

**Root cause:** In `src/components/auth/AuthForm.tsx`, the three `<input>` elements (Name, Email, Password) have `className="... px-3 py-2"` with **no text color and no placeholder color**. They inherit a too-light default. (The main chat `<textarea>` in `page.tsx` correctly uses `text-stone-800` — the auth inputs were simply missed.)

**Fix:** add `text-stone-800 placeholder-stone-400` to each of the three inputs' className. Concretely, each input className becomes:
```
className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
```
(the password input uses `mb-3` — keep that, just add the same color + focus classes).

**Then sweep for the same class of bug everywhere:** grep every `<input>` / `<textarea>` in `src/` and confirm each has an explicit visible text color and a visible placeholder color. The chat textarea already has `text-stone-800` but does NOT set a placeholder color — add `placeholder-stone-400` there too so "Ask Jesus…" is consistently legible. Any future input must follow this rule.

**Verify:** run the app (see "How to run" below), open the signup modal, type into Name/Email/Password, confirm typed text is clearly dark and placeholders are clearly readable. Tag `[runtime-tested]`.

---

## WORK ITEM 2: /impeccable review + full responsive / all-device optimization

Run the **`/impeccable`** skill (use `craft` to shape-then-build, or `review` against the current code) for a high-quality design pass. Goal: elevate the current functional-but-plain UI into something polished and reverent, AND make it work beautifully on every device (small phones → large desktop). Keep the calm stone/serif aesthetic; raise the craft (spacing, hierarchy, typography, motion, empty states).

**Responsive gaps to fix specifically:**
1. **Sidebar** (`Sidebar.tsx` + the `flex` wrapper in `page.tsx`): it's a fixed `w-64` always-on column. On mobile this crushes the chat. Make it a slide-in drawer (hamburger toggle in the header) under ~`md`, and the persistent column at `md+`. Add an overlay + close-on-select on mobile.
2. **Header** (`page.tsx`): "Speak with Jesus" + "What is this?" + auth/user menu must wrap/condense on narrow screens (the `UserMenu` has name + Log out + Delete account inline — too wide for phones; consider a compact menu/avatar dropdown on mobile).
3. **Chat column**: `max-w-2xl` is fine on desktop; ensure comfortable padding + full-width bubbles on small screens. Message bubbles `max-w-[80%]` ok; check long citations.
4. **Citation chips** (`CitationChip.tsx`): the expand popover is `absolute ... w-72` — verify it doesn't overflow the viewport on mobile; consider repositioning or a tap-friendly sheet on small screens.
5. **Auth modal + Disclaimer modal**: already `max-w-sm/md` + `p-4` inset — verify they fit small screens, scroll if needed, and are thumb-reachable. Inputs should be `text-base` (>=16px) so iOS Safari doesn't zoom on focus.
6. **Input bar** (`page.tsx` sticky bottom): confirm it stays above the iOS keyboard / safe-area; consider `env(safe-area-inset-bottom)`. Send button tap target >=44px.
7. **Touch targets + spacing**: all buttons/links >=44px tap area on mobile.

**Device targets to verify (browser-verify each):** iPhone SE (375px), iPhone 15 (393px), iPad (768px), laptop (1280px), wide (1536px). Both the empty state and an active conversation, anonymous and logged-in (sidebar drawer).

**Constraints (non-negotiable, from Doug's standards):**
- No native browser dialogs ever (`alert`/`confirm`/`prompt`) — custom modals only. (Already compliant; keep it.)
- No em dashes in any prose/UI copy you write. Use periods/commas.
- TypeScript only. Named `git add <files>` only (never `-A`/`.` — a hook blocks it).
- Keep all answers cited; don't touch the Prime Directive, persona, or grounding.
- Match the reverent tone. Don't make it look like a generic SaaS chatbot.

---

## How to run + verify (important infra gotchas)

- **Dev server:** `env -u SUPABASE_URL npm run dev` — you MUST unset the ambient `SUPABASE_URL` or a stale value from another project shadows `.env.local` and breaks Supabase. Open `http://localhost:3000` (HTTP, not HTTPS).
- **Env:** `.env.local` already has all keys (Anthropic, Voyage, Supabase URL/anon/service-role, Brave). Keys also live in `~/.secrets` as `AIJESUS_*`. Do not commit `.env.local` (gitignored).
- **Tests/build before commit:** `npx tsc --noEmit` (clean) + `npx vitest run` (33 tests green) + `npm run build` (succeeds). Don't break these.
- **Browser-verify** with the claude-in-chrome tools (load via ToolSearch `select:mcp__claude-in-chrome__*`). Resize the window/viewport per device target and screenshot. To type into React inputs, use the `computer` `type` action (NOT `form_input` — it sets the DOM value without firing React onChange, so state stays empty; we hit this already).
- **Test signup creds** (email confirmation is OFF, instant signup): any email like `test-aijesus-xxx@example.com` + any password. Clean up after with the in-app "Delete account" button (it cascades all data; verified).
- **Supabase DB access** (if needed): network has no IPv6, use the IPv4 pooler. `psql "postgresql://postgres.hakvxidkzajgkrqbnzhz:$(cat .supabase-db-password.txt)@aws-1-us-east-1.pooler.supabase.com:5432/postgres"`.

## Deploy (when done, after Doug approves)

`npx vercel deploy --prod --yes --scope dougkvamme-gmailcoms-projects`. Aliases to https://aijesus.vercel.app. All env vars already set in Vercel prod.

## Out of scope for this pass (don't get pulled in)

Upstash rate-limiter swap; buying a domain; cross-conversation memory; corpus widening; the X bot. Those are separate. This pass = contrast fix + /impeccable visual quality + responsive.

## Suggested sequence

1. Branch `build/impeccable`.
2. Fix Work Item 1 (inputs), verify, commit.
3. Run `/impeccable`, do the responsive + polish pass component by component, verifying each device target in the browser as you go.
4. Final: tsc + vitest + build green, full browser sweep across all device targets, show Doug, then deploy on his ok.
