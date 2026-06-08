"use client";
import { useState, useEffect, useCallback } from "react";
import { ChatMessage, type UiMessage } from "@/components/ChatMessage";
import { Thinking } from "@/components/Thinking";
import { Sidebar } from "@/components/Sidebar";
import { AuthForm } from "@/components/auth/AuthForm";
import { UserMenu } from "@/components/auth/UserMenu";
import { Disclaimer } from "@/components/Disclaimer";
import { browserClient } from "@/lib/supabase/client";
import { readLocal, writeLocal, clearLocal, type LocalConversation } from "@/lib/local-history";
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
          setDisclaimerFirstTime(true);
          setDisclaimerOpen(true);
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
        const id = conversationId ?? `local-${updated[0].content.slice(0, 8)}-${updated.length}`;
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
    setUser(null);
    setConversations([]);
    newConversation();
  }

  return (
    <div className="flex h-screen bg-stone-50">
      {user && (
        <Sidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={loadConversation}
          onNew={newConversation}
        />
      )}
      <main className="mx-auto flex h-full max-w-2xl flex-1 flex-col">
        <header className="flex items-center justify-between px-4 pt-6 pb-4">
          <h1 className="font-serif text-2xl text-stone-800">Speak with Jesus</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => { setDisclaimerFirstTime(false); setDisclaimerOpen(true); }} className="text-xs text-stone-400 hover:text-stone-600">
              What is this?
            </button>
            {user ? (
              <UserMenu name={user.name} onSignedOut={() => { setUser(null); newConversation(); }} onDelete={deleteAccount} />
            ) : (
              <button onClick={() => setShowAuth(true)} className="text-sm text-stone-600 hover:text-stone-900">
                Log in / Sign up
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4">
          {messages.length === 0 && (
            <p className="mt-16 text-center text-stone-400">Ask anything. Every answer is grounded in cited text.</p>
          )}
          {messages.map((m, i) => <ChatMessage key={i} m={m} />)}
          {loading && <Thinking />}
        </div>

        <div className="sticky bottom-0 bg-stone-50 px-4 pb-4 pt-2">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Jesus…"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-stone-400 focus:outline-none"
            />
            <button onClick={send} disabled={loading} className="rounded-xl bg-stone-800 px-5 py-3 text-stone-50 disabled:opacity-50">
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
