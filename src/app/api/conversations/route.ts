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
