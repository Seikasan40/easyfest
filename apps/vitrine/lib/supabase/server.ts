/**
 * Helpers Supabase côté serveur (RSC, Server Actions, Route Handlers).
 * Le service_role_key NE DOIT JAMAIS finir dans un bundle client.
 */
import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@easyfest/db/types/database";

export function createServerClient() {
  const cookieStore = cookies();
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) {
    throw new Error("Supabase env manquantes (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)");
  }

  return createSsrClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Ignored — appelé depuis un RSC pure (pas de set possible)
        }
      },
    },
  });
}

/**
 * Client privilégié — JAMAIS utilisé depuis un composant client.
 * Réservé aux Server Actions sensibles, Route Handlers et scripts admin.
 */
export function createServiceClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) throw new Error("Service role key non configurée");
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
