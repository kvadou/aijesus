"use client";
import type { ConversationSummary } from "@/lib/conversations";

export function Sidebar({
  conversations,
  activeId,
  open,
  onSelect,
  onNew,
  onClose,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClose: () => void;
}) {
  function select(id: string) {
    onSelect(id);
    onClose();
  }
  function startNew() {
    onNew();
    onClose();
  }

  return (
    <>
      {/* Dim the chat behind the drawer on small screens only. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-stone-900/30 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-stone-200 bg-stone-100/80 p-3 backdrop-blur-sm transition-transform duration-300 ease-out md:static md:z-auto md:w-64 md:translate-x-0 md:bg-stone-100/60 md:backdrop-blur-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="mb-3 flex items-center justify-between md:block">
          <span className="px-1 font-serif text-sm text-stone-500 md:hidden">
            Conversations
          </span>
          <button
            onClick={onClose}
            aria-label="Close conversations"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-white/70 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <button
          onClick={startNew}
          className="mb-3 flex min-h-11 items-center justify-center rounded-lg bg-stone-800 px-3 text-sm text-stone-50 transition-colors hover:bg-stone-700"
        >
          New conversation
        </button>
        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-stone-400">
              Your past conversations will gather here.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className={`mb-1 flex min-h-11 w-full items-center truncate rounded-lg px-3 text-left text-sm transition-colors ${
                  c.id === activeId
                    ? "bg-white text-stone-800 shadow-sm"
                    : "text-stone-600 hover:bg-white/70"
                }`}
              >
                <span className="truncate">{c.title}</span>
              </button>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
