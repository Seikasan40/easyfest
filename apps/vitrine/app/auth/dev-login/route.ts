import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /auth/dev-login?email=...&password=...&redirect=/hub&secret=...
 * Route de bypass POUR TEST RAPIDE.
 *
 * Sécurisée par DEV_LOGIN_SECRET (env var). Si la variable n'est pas
 * définie en prod, la route est désactivée → 404.
 *
 * À supprimer en V1 GA.
 */
export async function GET(req: Request) {
  const expected = process.env.DEV_LOGIN_SECRET?.trim();

  // En prod sans secret défini → la route n'existe pas
  if (!expected || expected.length < 16) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const provided = url.searchParams.get("secret");

  if (provided !== expected) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const password = url.searchParams.get("password");
  const redirect = url.searchParams.get("redirect") ?? "/hub";

  if (!email || !password) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Strip query string to avoid leaking creds in logs/history
  const target = new URL(redirect, url.origin);
  return NextResponse.redirect(target);
}
