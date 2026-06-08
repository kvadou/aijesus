import { NextResponse } from "next/server";
import { userServerClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function DELETE() {
  const supabase = await userServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = serviceClient();
  const { error } = await admin.auth.admin.deleteUser(auth.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await supabase.auth.signOut();
  return NextResponse.json({ deleted: true });
}
