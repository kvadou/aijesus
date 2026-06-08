import type { SupabaseClient } from "@supabase/supabase-js";
import type { Citation } from "@/chat/agent";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}

export function autoTitle(firstUserMessage: string): string {
  const clean = firstUserMessage.trim().replace(/\s+/g, " ");
  return clean.length > 60 ? clean.slice(0, 61).trimEnd() + "…" : clean;
}

export async function createConversation(
  client: SupabaseClient,
  userId: string,
  title: string,
): Promise<string> {
  const { data, error } = await client
    .from("conversations")
    .insert({ user_id: userId, title })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data!.id as string;
}

export async function appendMessage(
  client: SupabaseClient,
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  citations: Citation[],
): Promise<void> {
  const { error } = await client.from("messages").insert({
    conversation_id: conversationId,
    role,
    content,
    citations,
  });
  if (error) throw new Error(error.message);
}

export async function touchConversation(client: SupabaseClient, conversationId: string): Promise<void> {
  await client.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);
}

export async function listConversations(client: SupabaseClient): Promise<ConversationSummary[]> {
  const { data, error } = await client
    .from("conversations")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at }));
}

export async function loadMessages(client: SupabaseClient, conversationId: string): Promise<StoredMessage[]> {
  const { data, error } = await client
    .from("messages")
    .select("role,content,citations")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ role: r.role, content: r.content, citations: r.citations ?? [] }));
}
