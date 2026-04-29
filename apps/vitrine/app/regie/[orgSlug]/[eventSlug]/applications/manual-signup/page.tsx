import { createServerClient } from "@/lib/supabase/server";
import { ManualSignupForm } from "@/components/manual-signup-form";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function ManualSignupPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: positions } = await supabase
    .from("positions")
    .select("slug, name, icon")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <div className="max-w-xl space-y-4">
      <header>
        <h2 className="font-display text-2xl font-bold">Inscription manuelle</h2>
        <p className="text-sm text-brand-ink/60">
          Capture rapide d'un·e bénévole qui se présente en personne. Le compte est validé
          immédiatement et le mail magic-link envoyé.
        </p>
      </header>

      <ManualSignupForm eventId={ev.id} positions={positions ?? []} />
    </div>
  );
}
