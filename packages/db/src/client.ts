/**
 * Helpers Supabase clients — to be re-exported par les apps.
 * Le service_role_key NE DOIT JAMAIS finir dans un bundle client.
 * Vérification CI : grep "SUPABASE_SERVICE_ROLE_KEY" apps/*\/.next → ZÉRO match.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types/database";

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? process.env["EXPO_PUBLIC_SUPABASE_URL"] ?? "";
const ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] ?? "";

if (!SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("[@easyfest/db] NEXT_PUBLIC_SUPABASE_URL manquant — clients ne fonctionneront pas.");
}

/** Client public (anon key) — RLS active, à utiliser côté browser/server-side public. */
export function createAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

/**
 * Client privilégié (service_role) — JAMAIS dans bundle client.
 * À utiliser uniquement dans Server Actions, Edge Functions, scripts admin/CI.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY manquant — refus de créer un client privilégié.");
  }
  return createClient<Database>(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
