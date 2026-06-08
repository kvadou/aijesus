"use client";
import { useState, useEffect, useCallback } from "react";
import { ChatMessage, type UiMessage } from "@/components/ChatMessage";
import { Thinking } from "@/components/Thinking";
import { Sidebar } from "@/components/Sidebar";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { Disclaimer } from "@/components/Disclaimer";
import { browserClient } from "@/lib/supabase/client";
import { readLocal, writeLocal, clearLocal } from "@/lib/local-history";
import type { ConversationSummary } from "@/lib/conversations";

const ACK_KEY = "aijesus.disclaimer_ack";

export default function Home() {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [disclaimerFirstTime, setDisclaimerFirstTime] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data.conversations ?? []);
  }, []);

  useEffect(() => {
    const supabase = browserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const name = (data.user.user_metadata?.display_name as string) || data.user.email || "friend";
        setUser({ id: data.user.id, name });
        const { data: profile } = await supabase.from("profiles").select("disclaimer_acknowledged").single();
        if (!profile?.disclaimer_acknowledged) {
          if (window.localStorage.getItem(ACK_KEY) === "1") {
            // Carry over an acknowledgement made while anonymous so we never show it twice.
            supabase.from("profiles").update({ disclaimer_acknowledged: true }).eq("id", data.user.id).then(() => {});
          } else {
            setDisclaimerFirstTime(true);
            setDisclaimerOpen(true);
          }
        }
        await refreshConversations();
        const local = readLocal(window.localStorage);
        if (local.length > 0) {
          await fetch("/api/conversations/migrate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ conversations: local }),
          });
          clearLocal(window.localStorage);
          await refreshConversations();
        }
      } else {
        const local = readLocal(window.localStorage);
        if (local[0]) {
          setMessages(local[0].messages);
          setConversationId(local[0].id);
        }
        if (window.localStorage.getItem(ACK_KEY) !== "1") {
          setDisclaimerFirstTime(true);
          setDisclaimerOpen(true);
        }
      }
    });
  }, [refreshConversations]);

  function acknowledgeDisclaimer() {
    setDisclaimerOpen(false);
    if (user) {
      browserClient().from("profiles").update({ disclaimer_acknowledged: true }).eq("id", user.id).then(() => {});
    } else {
      window.localStorage.setItem(ACK_KEY, "1");
    }
  }

  async function loadConversation(id: string) {
    setConversationId(id);
    const res = await fetch(`/api/conversations/${id}`);
    const data = await res.json();
    setMessages(data.messages ?? []);
  }

  function newConversation() {
    setConversationId(null);
    setMessages([]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: UiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        }),
      });
      const data = await res.json();
      const content = data.text ?? data.error ?? "Something went wrong. Try again.";
      const updated: UiMessage[] = [...next, { role: "assistant", content, citations: data.citations ?? [] }];
      setMessages(updated);
      if (data.conversationId) {
        setConversationId(data.conversationId);
        if (user) refreshConversations();
      }
      if (!user) {
        const id = conversationId ?? crypto.randomUUID();
        const title = updated[0].content.slice(0, 60);
        const others = readLocal(window.localStorage).filter((c) => c.id !== id);
        writeLocal(window.localStorage, [
          { id, title, messages: updated.map((m) => ({ role: m.role, content: m.content, citations: m.citations ?? [] })) },
          ...others,
        ]);
        setConversationId(id);
      }
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", content: "Something failed. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    await fetch("/api/account", { method: "DELETE" });
    await browserClient().auth.signOut();
    window.localStorage.removeItem(ACK_KEY);
    setUser(null);
    setConversations([]);
    newConversation();
  }

  return (
    <div className="flex h-[100dvh] bg-stone-50">
      {user && (
        <Sidebar
          conversations={conversations}
          activeId={conversationId}
          open={sidebarOpen}
          onSelect={loadConversation}
          onNew={newConversation}
          onClose={() => setSidebarOpen(false)}
        />
      )}
      <main className="mx-auto flex h-full w-full max-w-2xl flex-1 flex-col">
        <header
          className="flex items-center gap-2 px-4 pb-4 pt-5"
          style={{ paddingTop: "max(1.25rem, env(safe-area-inset-top))" }}
        >
          {user && (
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open conversations"
              className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-200/60 md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          )}
          <h1 className="truncate font-serif text-xl text-stone-800 sm:text-2xl">Speak with Jesus</h1>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <button onClick={() => { setDisclaimerFirstTime(false); setDisclaimerOpen(true); }} className="hidden text-xs text-stone-400 transition-colors hover:text-stone-600 sm:block">
              What is this?
            </button>
            {user ? (
              <UserMenu name={user.name} onSignedOut={() => { setUser(null); newConversation(); }} onDelete={deleteAccount} />
            ) : (
              <button onClick={() => setShowAuth(true)} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-stone-600 transition-colors hover:bg-stone-200/60 hover:text-stone-900">
                Log in
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4">
          {messages.length === 0 && (
            <div className="mx-auto mt-[18vh] max-w-sm px-2 text-center">
              <p className="font-serif text-xl leading-relaxed text-stone-500">
                Ask anything.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Every answer is drawn from public-domain scripture, and every claim is cited so you can check it yourself.
              </p>
            </div>
          )}
          {messages.map((m, i) => <ChatMessage key={i} m={m} />)}
          {loading && <Thinking />}
        </div>

        <div
          className="sticky bottom-0 bg-stone-50/95 px-4 pt-2 backdrop-blur-sm"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Jesus…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-800 placeholder-stone-400 transition-colors focus:border-stone-400 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              aria-label="Send"
              className="flex h-12 min-w-12 items-center justify-center rounded-xl bg-stone-800 px-5 text-stone-50 transition-colors hover:bg-stone-700 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </main>

      {showAuth && !user && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-900/40 p-4" onClick={() => setShowAuth(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AuthForm onAuthed={() => { setShowAuth(false); window.location.reload(); }} />
          </div>
        </div>
      )}

      <Disclaimer
        open={disclaimerOpen}
        firstTime={disclaimerFirstTime}
        onAcknowledge={acknowledgeDisclaimer}
        onClose={() => setDisclaimerOpen(false)}
      />
    </div>
  );
}
