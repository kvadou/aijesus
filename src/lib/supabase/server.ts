import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// User-scoped server client. Reads the session from cookies, so queries run as the
// logged-in user and RLS applies. Use for conversations/messages/profiles.
export async function userServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component; safe to ignore (middleware refreshes)
          }
        },
      },
    },
  );
}
