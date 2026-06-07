"use client";
import { useState } from "react";
import { ChatMessage, type UiMessage } from "@/components/ChatMessage";
import { Thinking } from "@/components/Thinking";
import { Disclosure } from "@/components/Disclosure";

export default function Home() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

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
        body: JSON.stringify({ messages: next.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const content = data.text ?? data.error ?? "Something went wrong. Try again.";
      setMessages((cur) => [...cur, { role: "assistant", content, citations: data.citations ?? [] }]);
    } catch {
      setMessages((cur) => [...cur, { role: "assistant", content: "Something failed. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-stone-50">
      <header className="px-4 pt-10 pb-4 text-center">
        <h1 className="font-serif text-3xl text-stone-800">Speak with Jesus</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4">
        {messages.length === 0 && (
          <p className="mt-16 text-center text-stone-400">Ask anything. Every answer is grounded in cited text.</p>
        )}
        {messages.map((m, i) => <ChatMessage key={i} m={m} />)}
        {loading && <Thinking />}
      </div>

      <div className="sticky bottom-0 bg-stone-50 px-4 pb-2 pt-2">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Jesus…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-200 px-4 py-3 text-stone-800 focus:border-stone-400 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={loading}
            className="rounded-xl bg-stone-800 px-5 py-3 text-stone-50 disabled:opacity-50"
          >
            Send
          </button>
        </div>
        <Disclosure />
      </div>
    </main>
  );
}
