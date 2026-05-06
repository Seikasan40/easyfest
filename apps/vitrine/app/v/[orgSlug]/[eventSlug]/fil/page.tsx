import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const CHANNEL_COLORS: Record<string, string> = {
  direction:    "#1A3828",
  sécurité:     "#C49A2C",
  logistique:   "#4A7C59",
  bar:          "#7B4F2E",
  scène:        "#2A5C8F",
  accueil:      "#8B4513",
  default:      "#1A3828",
};

function channelColor(name?: string): string {
  if (!name) return CHANNEL_COLORS["default"];
  const key = name.toLowerCase();
  return Object.keys(CHANNEL_COLORS).find(k => key.includes(k))
    ? CHANNEL_COLORS[Object.keys(CHANNEL_COLORS).find(k => key.includes(k))!]
    : CHANNEL_COLORS["default"];
}

export default async function FilPage({ params }: PageProps) {
  const { orgSlug, eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, organization:organization_id (name)")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: messagesRaw } = await supabase
    .from("messages")
    .select("id, content, is_broadcast, created_at, sender_user_id, channel_id")
    .order("created_at", { ascending: false })
    .limit(60);

  const senderIds = Array.from(
    new Set((messagesRaw ?? []).map((m: any) => m.sender_user_id).filter(Boolean)),
  );
  const channelIds = Array.from(
    new Set((messagesRaw ?? []).map((m: any) => m.channel_id).filter(Boolean)),
  );

  const [profilesRes, channelsRes] = await Promise.all([
    senderIds.length
      ? supabase
          .from("volunteer_profiles")
          .select("user_id, full_name, first_name, last_name")
          .in("user_id", senderIds)
      : Promise.resolve({ data: [] as any[] }),
    channelIds.length
      ? supabase
          .from("message_channels")
          .select("id, name, kind, color")
          .in("id", channelIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profilesById = new Map<string, any>(
    (profilesRes.data ?? []).map((p: any) => [p.user_id, p]),
  );
  const channelsById = new Map<string, any>(
    (channelsRes.data ?? []).map((c: any) => [c.id, c]),
  );

  const messages = (messagesRaw ?? []).map((m: any) => ({
    ...m,
    sender: profilesById.get(m.sender_user_id) ?? null,
    channel: channelsById.get(m.channel_id) ?? null,
  }));

  const broadcastMessages = messages.filter((m: any) => m.is_broadcast);
  const otherMessages = messages.filter((m: any) => !m.is_broadcast);

  const orgName = (ev as any).organization?.name ?? "";

  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5"
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
          Fil d&apos;actu
        </h1>
        <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Annonces et messages de la régie
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-5 space-y-4">

        {messages.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-8 text-center mt-4"
            style={{ borderColor: "#E5DDD0", background: "rgba(255,255,255,0.6)" }}
          >
            <p className="text-3xl mb-2">📣</p>
            <p className="font-semibold" style={{ color: "#1A3828" }}>
              Aucun message pour l&apos;instant
            </p>
            <p className="mt-1 text-sm" style={{ color: "#7A7060" }}>
              Les annonces s&apos;afficheront ici en direct.
            </p>
          </div>
        ) : (
          <>
            {/* Diffusions */}
            {broadcastMessages.length > 0 && (
              <section>
                {/* Divider "ANNONCES" */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: "#7A7060" }}
                  >
                    📣 Annonces officielles
                  </span>
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                </div>

                <ul className="space-y-3">
                  {broadcastMessages.map((m: any) => {
                    const senderName =
                      m.sender?.full_name ??
                      [m.sender?.first_name, m.sender?.last_name].filter(Boolean).join(" ") ??
                      "Régie";
                    const chName = m.channel?.name ?? m.channel?.kind ?? "";
                    const color = m.channel?.color ?? channelColor(chName) ?? "#1A3828";
                    return (
                      <li
                        key={m.id}
                        className="rounded-2xl bg-white shadow-sm overflow-hidden"
                        style={{ borderLeft: `4px solid ${color}` }}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {chName && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                                style={{
                                  background: `${color}18`,
                                  color: color,
                                }}
                              >
                                {chName}
                              </span>
                            )}
                            <span
                              className="text-[10px] rounded-full px-2 py-0.5 font-medium"
                              style={{ background: "#F5E9C4", color: "#C49A2C" }}
                            >
                              📣 diffusion
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "#1A1A1A" }}>
                            {m.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs" style={{ color: "#7A7060" }}>
                              {senderName}
                            </span>
                            <time className="text-xs" style={{ color: "#9A9080" }}>
                              {timeAgo(m.created_at)}
                            </time>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* Autres messages */}
            {otherMessages.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.15em]"
                    style={{ color: "#7A7060" }}
                  >
                    Messages équipes
                  </span>
                  <div className="flex-1 h-px" style={{ background: "#E5DDD0" }} />
                </div>

                <ul className="space-y-2">
                  {otherMessages.map((m: any) => {
                    const senderName =
                      m.sender?.full_name ??
                      [m.sender?.first_name, m.sender?.last_name].filter(Boolean).join(" ") ??
                      "Équipe";
                    const chName = m.channel?.name ?? m.channel?.kind ?? "";
                    const color = m.channel?.color ?? channelColor(chName) ?? "#4A7C59";
                    return (
                      <li
                        key={m.id}
                        className="rounded-xl bg-white overflow-hidden"
                        style={{
                          borderLeft: `3px solid ${color}`,
                          boxShadow: "0 1px 3px rgba(26,26,26,0.06)",
                        }}
                      >
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-1">
                            {chName && (
                              <span
                                className="text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-0.5"
                                style={{ background: `${color}15`, color }}
                              >
                                {chName}
                              </span>
                            )}
                            <time className="text-[10px] ml-auto" style={{ color: "#9A9080" }}>
                              {timeAgo(m.created_at)}
                            </time>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "#1A1A1A" }}>
                            {m.content}
                          </p>
                          <p className="text-xs mt-1" style={{ color: "#7A7060" }}>
                            {senderName}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </>
        )}

        {/* CTA Chat */}
        <div className="pt-2">
          <a
            href={`/v/${orgSlug}/${eventSlug}/chat`}
            className="flex items-center justify-center gap-2 w-full rounded-2xl py-3.5 text-sm font-semibold transition"
            style={{
              background: "rgba(26,56,40,0.08)",
              color: "#1A3828",
              border: "1.5px solid rgba(26,56,40,0.18)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            Envoyer un message à l&apos;équipe
          </a>
        </div>
      </div>
    </div>
  );
}
