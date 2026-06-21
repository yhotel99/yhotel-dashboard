import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_HR_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_HR_SUPABASE_ANON_KEY;

export function isHrSupabaseConfigured(): boolean {
  return Boolean(url && key);
}

export function getHrSupabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error("HR Supabase chưa được cấu hình");
  }
  return createClient(url, key);
}

/** Singleton for client-side usage */
let hrSupabaseClient: SupabaseClient | null = null;

export function hrSupabase(): SupabaseClient {
  if (!hrSupabaseClient) {
    hrSupabaseClient = getHrSupabase();
  }
  return hrSupabaseClient;
}
