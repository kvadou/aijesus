"use client";
import { useEffect, useState } from "react";

const PHRASES = [
  "Searching the scriptures",
  "Weighing the witness of the texts",
  "Reflecting",
];

export function Thinking() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mb-6 flex justify-start" aria-live="polite">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-stone-500 shadow-sm">
        <span className="flex gap-1" aria-hidden="true">
          <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
        </span>
        <span className="text-sm italic">{PHRASES[i]}…</span>
      </div>
    </div>
  );
}
