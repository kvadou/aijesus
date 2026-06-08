"use client";
import { useState } from "react";
import type { Citation } from "@/chat/agent";

export function CitationChip({ c }: { c: Citation }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-full border border-amber-300/70 bg-amber-50 px-2.5 py-1 font-serif text-xs text-amber-900 transition-colors hover:bg-amber-100"
      >
        {c.reference}
      </button>

      {open && (
        <>
          {/* Tap-away scrim, phones only. */}
          <span
            onClick={() => setOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 sm:hidden"
          />
          {/* Bottom sheet on phones, anchored popover from sm up. */}
          <span
            className="fixed inset-x-3 bottom-3 z-50 block rounded-xl border border-stone-200 bg-white p-4 text-sm leading-relaxed text-stone-700 shadow-xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-1.5 sm:w-72 sm:rounded-lg sm:p-3 sm:shadow-lg"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <span className="mb-1.5 block text-xs uppercase tracking-wide text-stone-400">
              {c.sourceId} · tier {c.tier}
            </span>
            <span className="block font-serif text-[15px] leading-relaxed text-stone-700">
              {c.text}
            </span>
          </span>
        </>
      )}
    </span>
  );
}
