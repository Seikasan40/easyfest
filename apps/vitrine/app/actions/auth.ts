"use server";

import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

interface PasswordResult {
  ok: boolean;
  error?: string;
}

export async function loginWithPassword(formData: FormData): Promise<PasswordResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/hub";

  if (!email || !password) return { ok: false, error: "Email et mot de passe requis" };

  const supabase = createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };

  // Redirect côté serveur (le cookie a été posé via Next cookies() par createServerClient)
  redirect(redirectTo);
}

export async function sendMagicLink(formData: FormData): Promise<PasswordResult> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const redirectTo = (formData.get("redirect") as string) || "/hub";

  if (!email) return { ok: false, error: "Email requis" };

  const supabase = createServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env["NEXT_PUBLIC_APP_URL"]}/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
