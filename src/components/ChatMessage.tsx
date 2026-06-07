import type { Citation } from "@/chat/agent";
import { CitationChip } from "./CitationChip";

export interface UiMessage {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export function ChatMessage({ m }: { m: UiMessage }) {
  const isUser = m.role === "user";
  return (
    <div className={`mb-6 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? "bg-stone-800 text-stone-50" : "bg-white text-stone-800 shadow-sm"}`}>
        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
        {m.citations && m.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap border-t border-stone-100 pt-2">
            {m.citations.map((c, i) => <CitationChip key={i} c={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}
