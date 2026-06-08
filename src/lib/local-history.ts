import type { Citation } from "@/chat/agent";

export interface LocalMessage {
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
}
export interface LocalConversation {
  id: string;
  title: string;
  messages: LocalMessage[];
}

const KEY = "aijesus.history";

export function readLocal(storage: Storage): LocalConversation[] {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalConversation[]) : [];
  } catch {
    return [];
  }
}

export function writeLocal(storage: Storage, conversations: LocalConversation[]): void {
  storage.setItem(KEY, JSON.stringify(conversations));
}

export function clearLocal(storage: Storage): void {
  storage.removeItem(KEY);
}
