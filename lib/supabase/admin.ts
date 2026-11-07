import "server-only"; // build fails if this file is ever imported into browser code

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Admin Supabase client using the SERVICE ROLE key. It bypasses RLS, so:
 * - use it only in server code (server actions, route handlers),
 * - only after checking who the user is and what they may do,
 * - and pass the acting user's id to the money functions (they re-check ownership).
 *
 * Create a new client per request; don't keep it in a global.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
