"use client";
import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export function AuthForm({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const supabase = browserClient();
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName || null } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onAuthed();
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-serif text-xl text-stone-800">
        {mode === "signup" ? "Create an account" : "Welcome back"}
      </h2>
      {mode === "signup" && (
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Name (optional)"
          className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
        />
      )}
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        className="mb-2 w-full rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        type="password"
        placeholder="Password"
        className="mb-3 w-full rounded-lg border border-stone-200 px-3 py-2 text-base text-stone-800 placeholder-stone-400 focus:border-stone-400 focus:outline-none"
      />
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !email || !password}
        className="w-full rounded-lg bg-stone-800 py-2 text-stone-50 disabled:opacity-50"
      >
        {busy ? "…" : mode === "signup" ? "Sign up" : "Log in"}
      </button>
      <button
        onClick={() => setMode(mode === "signup" ? "login" : "signup")}
        className="mt-3 w-full text-sm text-stone-500 hover:text-stone-700"
      >
        {mode === "signup" ? "Have an account? Log in" : "New here? Create an account"}
      </button>
    </div>
  );
}
