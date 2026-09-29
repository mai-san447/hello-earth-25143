import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "cloudflare:workers";

type SupabaseBindings = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function getSupabaseAdmin(): SupabaseClient {
  const bindings = env as unknown as SupabaseBindings;
  const url = bindings.SUPABASE_URL;
  const serviceRoleKey = bindings.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase bindings are not configured.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
