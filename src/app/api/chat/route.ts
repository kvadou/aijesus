import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "@/corpus/store";
import { runAgent } from "@/chat/agent";
import { checkRateLimit } from "@/chat/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// PUBLIC by design (anonymous access is intentional per the Prime Directive).
// Basic in-memory per-IP rate limiting is now IN PLACE (30-second sliding window,
// 8 requests max). This throttles a single client hitting a warm serverless instance.
// For durable cross-instance enforcement, replace checkRateLimit with @upstash/ratelimit
// backed by Upstash Redis (UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars).
// The route depends only on the checkRateLimit() signature, so it is a drop-in upgrade.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limit = checkRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };
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
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
