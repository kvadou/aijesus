"use client";
import { useState } from "react";
import type { Citation } from "@/chat/agent";

export function CitationChip({ c }: { c: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mr-1 mb-1 rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
      >
        {c.reference}
      </button>
      {open && (
        <span className="absolute z-10 mt-1 block w-72 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700 shadow-lg">
          <span className="mb-1 block text-xs uppercase tracking-wide text-stone-400">
            {c.sourceId} · tier {c.tier}
          </span>
          {c.text}
        </span>
      )}
    </span>
  );
}
