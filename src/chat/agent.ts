import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { TOOL_DEFS, dispatchTool } from "@/chat/tools";
import { JESUS_SYSTEM_PROMPT } from "@/persona/jesus-persona";

export interface Citation { reference: string; sourceId: string; tier: number; text: string; }
export interface AgentResult { text: string; citations: Citation[]; }

const MODEL = "claude-opus-4-8";
const MAX_TURNS = 6;

function harvest(toolResult: string): Citation[] {
  const out: Citation[] = [];
  const re = /\[([^—\]]+) — ([^,]+), tier (\d+)\]\s*([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(toolResult))) {
    out.push({ reference: m[1].trim(), sourceId: m[2].trim(), tier: Number(m[3]), text: m[4].trim() });
  }
  return out;
}

export async function runAgent(
  anthropic: Anthropic,
  db: SupabaseClient,
  messages: Anthropic.MessageParam[],
): Promise<AgentResult> {
  const convo = [...messages];
  const citations: Citation[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: JESUS_SYSTEM_PROMPT,
      tools: TOOL_DEFS,
      messages: convo,
    });

    if (res.stop_reason !== "tool_use") {
      const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
      return { text, citations };
    }

    convo.push({ role: "assistant", content: res.content });
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of res.content as any[]) {
      if (block.type !== "tool_use") continue;
      const result = await dispatchTool(db, block.name, block.input);
      if (block.name !== "search_live_context") citations.push(...harvest(result));
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }
    convo.push({ role: "user", content: toolResults });
  }

  return { text: "I have searched but cannot answer faithfully within my limits here.", citations };
}
