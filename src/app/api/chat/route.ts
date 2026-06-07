import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "@/corpus/store";
import { runAgent } from "@/chat/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// PUBLIC by design (anonymous access is intentional per the Prime Directive).
// PRE-PROD REQUIREMENT: add per-IP rate limiting (Vercel KV / Upstash) before public
// launch — this open endpoint calls a paid LLM and is otherwise a cost-abuse vector.
// Input caps below are a first-line guard, not a substitute for rate limiting.
export async function POST(req: NextRequest) {
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

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const db = makeClient();

  try {
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
