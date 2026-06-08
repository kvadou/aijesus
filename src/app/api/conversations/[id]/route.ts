import { NextRequest, NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { loadMessages } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ messages: await loadMessages(supabase, id) });
}
