"use client";
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
  async function logout() {
    await browserClient().auth.signOut();
    onSignedOut();
  }
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-stone-600">{name}</span>
      <button onClick={logout} className="text-stone-500 hover:text-stone-800">
        Log out
      </button>
      <button onClick={onDelete} className="text-red-500 hover:text-red-700">
        Delete account
      </button>
    </div>
  );
}
