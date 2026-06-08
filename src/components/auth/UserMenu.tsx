"use client";
import { useEffect, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";

export function UserMenu({
  name,
  onSignedOut,
  onDelete,
}: {
  name: string;
  onSignedOut: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function logout() {
    await browserClient().auth.signOut();
    onSignedOut();
  }

  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-stone-200/60"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800 font-serif text-sm text-stone-50">
          {initial}
        </span>
        <span className="hidden max-w-32 truncate text-sm text-stone-600 sm:block">
          {name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg"
        >
          <div className="border-b border-stone-100 px-4 py-3">
            <p className="truncate text-sm text-stone-800">{name}</p>
            <p className="text-xs text-stone-400">Signed in</p>
          </div>
          <button
            onClick={logout}
            role="menuitem"
            className="flex min-h-11 w-full items-center px-4 text-left text-sm text-stone-700 transition-colors hover:bg-stone-50"
          >
            Log out
          </button>
          {confirmingDelete ? (
            <div className="border-t border-stone-100 px-4 py-3">
              <p className="mb-2 text-xs text-stone-500">
                This erases your account and every conversation. It cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-lg border border-stone-200 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-50"
                >
                  Keep
                </button>
                <button
                  onClick={onDelete}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm text-white transition-colors hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              role="menuitem"
              className="flex min-h-11 w-full items-center border-t border-stone-100 px-4 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
            >
              Delete account
            </button>
          )}
        </div>
      )}
    </div>
  );
}
