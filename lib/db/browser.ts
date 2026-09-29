"use client";
import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;
export function browserDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return client ||= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
