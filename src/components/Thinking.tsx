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
    <div className="mb-7 flex items-center gap-3 text-stone-400" aria-live="polite">
      <span className="flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.4s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400 [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      </span>
      <span className="font-serif text-[15px] italic">{PHRASES[i]}…</span>
    </div>
  );
}
