import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role client. Full access, bypasses RLS. Use ONLY for public reference
// data (corpus_chunks) and admin operations (account deletion). Never expose to the browser.
export function serviceClient(): SupabaseClient {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
