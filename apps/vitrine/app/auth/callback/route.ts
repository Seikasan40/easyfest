/**
 * Magic-link callback : Supabase redirige ici avec un code OAuth.
 * On l'échange contre une session puis on redirige vers la route demandée.
 */
import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirect = url.searchParams.get("redirect") ?? "/";

  if (code) {
    const supabase = createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, url));
    }
  }

  return NextResponse.redirect(new URL(redirect, url));
}
