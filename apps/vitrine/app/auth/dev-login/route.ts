import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /auth/dev-login?email=...&password=...&redirect=/hub
 * Route de bypass pour test rapide (à supprimer en V1 GA).
 * Utilise Server Action auth flow → pose le cookie côté serveur.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const password = url.searchParams.get("password");
  const redirect = url.searchParams.get("redirect") ?? "/hub";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Redirect vers la page demandée. Le cookie a été posé via createServerClient.
  const target = new URL(redirect, url.origin);
  return NextResponse.redirect(target);
}
