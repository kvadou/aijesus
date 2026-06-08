import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "@/corpus/store";
import { runAgent } from "@/chat/agent";
import { ipAddress } from "@vercel/functions";
import { checkRateLimit } from "@/chat/rate-limit";
import { userServerClient } from "@/lib/supabase/server";
import { createConversation, appendMessage, touchConversation, autoTitle } from "@/lib/conversations";

export const runtime = "nodejs";
export const maxDuration = 60;

// PUBLIC by design (anonymous access is intentional per the Prime Directive).
// Basic in-memory per-IP rate limiting is now IN PLACE (30-second sliding window,
// 8 requests max). This throttles a single client hitting a warm serverless instance.
// For durable cross-instance enforcement, replace checkRateLimit with @upstash/ratelimit
// backed by Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars).
// The route depends only on the checkRateLimit() signature, so it is a drop-in upgrade.
export async function POST(req: NextRequest) {
  // Use Vercel's verified client IP, not the client-controlled first X-Forwarded-For
  // value (which is spoofable and would let an attacker rotate past the rate limit).
  // Fall back to the LAST XFF entry (appended by the trusted proxy) then "unknown".
  const ip = ipAddress(req) ?? req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { messages, conversationId } = (await req.json()) as {
    messages: { role: "user" | "assistant"; content: string }[];
    conversationId?: string;
  };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }

  if (messages.length > 50) {
    return NextResponse.json({ error: "too many messages" }, { status: 400 });
  }
  let totalChars = 0;
  for (const m of messages) {
    if (typeof m.content !== "string" || m.content.length > 4000) {
      return NextResponse.json({ error: "message too long" }, { status: 400 });
    }
    totalChars += m.content.length;
  }
  if (totalChars > 24000) {
    return NextResponse.json({ error: "conversation too long" }, { status: 400 });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const db = makeClient();
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
}
