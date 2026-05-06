import { createServerClient } from "@/lib/supabase/server";
import { QrDisplay } from "@/components/qr-display";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function MyQrPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (name)")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) return null;

  // Récupère le profil pour afficher le prénom
  const { data: profile } = await supabase
    .from("volunteer_profiles")
    .select("full_name, first_name")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const firstName = (profile as any)?.first_name
    ?? (profile as any)?.full_name?.split(" ")[0]
    ?? "Toi";

  // Demande un token QR signé (Edge fn qr_sign)
  const { data: signed } = await supabase.functions.invoke("qr_sign", {
    body: {
      volunteer_user_id: userData.user.id,
      event_id: ev.id,
    },
  });

  const orgName = (ev as any).organization?.name ?? "";
  const eventName = (ev as any).name ?? "";

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {/* Header vert forêt */}
      <div
        className="px-5 pt-12 pb-6 text-center"
        style={{ background: "#1A3828" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-1"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          {orgName}
        </p>
        <h1
          className="font-display text-2xl font-bold leading-tight"
          style={{ color: "#FFFFFF" }}
        >
          Mon QR code
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          {firstName} · {eventName}
        </p>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-4 py-6 space-y-5">

        {/* Card QR principale */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#FFFFFF", boxShadow: "0 2px 16px rgba(26,56,40,0.10)" }}
        >
          <div className="px-6 pt-6 pb-4">
            <QrDisplay token={signed?.token} expiresAt={signed?.expires_at} />
          </div>
          <div
            className="px-5 py-3 border-t text-center"
            style={{ borderColor: "#E5DDD0" }}
          >
            <p className="text-xs font-medium" style={{ color: "#7A7060" }}>
              Se renouvelle toutes les 10 minutes · Fonctionne hors ligne
            </p>
          </div>
        </div>

        {/* 3 usages */}
        <div className="space-y-2">
          {[
            {
              icon: "🎟️",
              title: "Arrivée au festival",
              desc: "Présente ce code à l'accueil pour récupérer ton bracelet.",
            },
            {
              icon: "🍽️",
              title: "Repas bénévole",
              desc: "Valide ton repas à chaque créneau (1 scan par repas).",
            },
            {
              icon: "✅",
              title: "Prise de poste",
              desc: "Ton·ta chef·fe d'équipe scanne pour t'enregistrer en service.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "#FFFFFF", border: "1px solid #E5DDD0" }}
            >
              <span className="text-xl mt-0.5">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1A3828" }}>
                  {item.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#7A7060" }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Alerte sécurité */}
        <div
          className="rounded-xl px-4 py-3 flex items-start gap-2"
          style={{ background: "#F5E9C4", border: "1px solid #C49A2C30" }}
        >
          <span className="text-base mt-0.5">🔒</span>
          <p className="text-xs leading-relaxed" style={{ color: "#7B5C1A" }}>
            Ce code est personnel et unique. Ne le partage pas. Il change automatiquement pour ta sécurité.
          </p>
        </div>
      </div>
    </div>
  );
}
