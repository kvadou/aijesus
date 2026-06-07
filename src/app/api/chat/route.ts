import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { makeClient } from "@/corpus/store";
import { runAgent } from "@/chat/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as { messages: { role: "user" | "assistant"; content: string }[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
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
