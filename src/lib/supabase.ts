import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/**
 * Env values pasted through some shells/dashboards can carry a UTF-8 BOM or a
 * trailing newline, which silently breaks the URL and the apikey header.
 * Strip both so configuration mistakes fail loudly or not at all.
 */
function clean(v: string | undefined): string | undefined {
  const s = v?.replace(/^﻿/, "").trim();
  return s || undefined;
}

// Must be referenced literally so Next.js can inline them at build time.
const URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export function isConfigured() {
  return Boolean(URL && KEY);
}

export function supabase(): SupabaseClient {
  if (!client) {
    if (!URL || !KEY) throw new Error("Supabase env vars missing (see .env.example)");
    client = createClient(URL, KEY, { auth: { persistSession: false } });
  }
  return client;
}
