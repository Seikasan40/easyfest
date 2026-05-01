/**
 * /onboarding — wizard self-service direction (OC-01).
 * 5 étapes : org → event → template → équipe → done.
 * Skip auto si l'user a déjà une membership direction (redirect /hub).
 */
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabase/server";

import OnboardingWizard from "./OnboardingWizard";

export const metadata = { title: "Créer mon organisation — Easyfest" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/onboarding");
  }

  // Skip si l'user a déjà au moins une membership direction (le wizard est pour les NOUVEAUX directeurs).
  const { data: existingDirection } = await (supabase as any)
    .from("memberships")
    .select("event_id")
    .eq("user_id", user.id)
    .eq("role", "direction")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (existingDirection) {
    redirect("/hub");
  }

  // Récupère les templates publics pour l'étape 3
  const { data: templates } = await (supabase as any)
    .from("event_templates")
    .select("slug, name, description, jauge_label, positions")
    .eq("is_public", true)
    .order("display_order");

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-brand-coral text-sm font-medium uppercase tracking-widest">Easyfest</p>
      <h1 className="font-display mt-1 text-3xl font-bold">Créer mon organisation</h1>
      <p className="text-brand-ink/70 mt-2 text-sm">
        ~3 minutes. Tu pourras ajuster tous ces choix ensuite depuis le tableau de bord régie.
      </p>

      <OnboardingWizard userEmail={user.email ?? ""} templates={(templates as any[]) ?? []} />
    </main>
  );
}
