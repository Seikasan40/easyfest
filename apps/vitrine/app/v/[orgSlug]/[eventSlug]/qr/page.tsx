import { createServerClient } from "@/lib/supabase/server";
import { QrDisplay } from "@/components/qr-display";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function MyQrPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) return null;

  // Demande un token QR signé (Edge fn qr_sign)
  const { data: signed } = await supabase.functions.invoke("qr_sign", {
    body: {
      volunteer_user_id: userData.user.id,
      event_id: ev.id,
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-brand-ink/60">Présente ce code à l'arrivée</p>
        <h1 className="font-display text-2xl font-bold">Mon QR code</h1>
      </header>

      <QrDisplay token={signed?.token} expiresAt={signed?.expires_at} />

      <div className="rounded-xl bg-brand-sand/40 p-4 text-sm">
        <p className="font-medium">💡 Comment ça marche ?</p>
        <ul className="mt-2 list-disc pl-4 text-brand-ink/70">
          <li>À l'arrivée : tu présentes ce QR. Tu reçois ton bracelet.</li>
          <li>Aux repas : ce QR sert à valider ton repas (1 par créneau).</li>
          <li>En prise de poste : ton chef·fe scanne pour t'enregistrer.</li>
        </ul>
        <p className="mt-3 text-xs text-brand-ink/50">
          Le code change toutes les 10 minutes pour ta sécurité — il fonctionne hors-ligne
          tant que cette page reste ouverte.
        </p>
      </div>
    </div>
  );
}
