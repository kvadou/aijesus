"use client";
import type { ConversationSummary } from "@/lib/conversations";

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-stone-200 bg-stone-100/60 p-3">
      <button
        onClick={onNew}
        className="mb-3 rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-50"
      >
        New conversation
      </button>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`mb-1 block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${
              c.id === activeId ? "bg-white text-stone-800 shadow-sm" : "text-stone-600 hover:bg-white/70"
            }`}
          >
            {c.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
