import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import { searchCorpus, getPassage } from "@/corpus/retrieve";
import { searchLiveContext } from "@/chat/live-context";
import type { Passage } from "@/corpus/types";

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "search_corpus",
    description: "Semantic + keyword search over the public-domain scripture and historical corpus. Use this for anything about what Jesus taught or what the texts say. Returns passages with exact citations and authority tiers.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "what to search for" } },
      required: ["query"],
    },
  },
  {
    name: "get_passage",
    description: "Fetch the exact text of a specific reference, e.g. 'John 3:16'. Use to verify or quote a precise passage.",
    input_schema: {
      type: "object",
      properties: { reference: { type: "string", description: "canonical reference" } },
      required: ["reference"],
    },
  },
  {
    name: "search_live_context",
    description: "Search the live web for facts about current or modern events. Use ONLY for present-day facts. The moral reflection must still come from search_corpus, never from these results.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "current-events query" } },
      required: ["query"],
    },
  },
];

function formatPassages(passages: Passage[]): string {
  if (passages.length === 0) return "NO RESULTS. Do not invent a quote. Say the corpus has nothing on this.";
  return passages
    .map((p) => `[${p.reference} — ${p.sourceId}, tier ${p.authorityTier}] ${p.text}`)
    .join("\n");
}

export async function dispatchTool(
  client: SupabaseClient,
  name: string,
  input: Record<string, unknown>,
): Promise<string> {
  switch (name) {
    case "search_corpus":
      return formatPassages(await searchCorpus(client, String(input.query)));
    case "get_passage":
      return formatPassages(await getPassage(client, String(input.reference)));
    case "search_live_context": {
      const facts = await searchLiveContext(String(input.query));
      if (facts.length === 0) return "NO LIVE RESULTS.";
      return facts.map((f) => `[${f.published ?? "undated"}] ${f.title} — ${f.url}: ${f.snippet}`).join("\n");
    }
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}
