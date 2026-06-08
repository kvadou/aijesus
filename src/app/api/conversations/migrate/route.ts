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
