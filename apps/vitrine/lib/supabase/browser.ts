"use client";

/**
 * Helper Supabase côté browser (Client Components, hooks).
 * Anon key seulement. RLS protège tout.
 */
import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

import type { Database } from "@easyfest/db/types/database";

export function createBrowserClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) throw new Error("Supabase env manquantes côté browser");
  return createSsrBrowserClient<Database>(url, anonKey);
}
