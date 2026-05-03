import { formatDateTimeFr } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { BroadcastForm } from "@/components/broadcast-form";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function MessagesPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  // Bug #1 fix (audit-extreme 3 mai 2026) : l'embed `sender:sender_user_id (raw_user_meta_data)`
  // est cassé car `messages.sender_user_id` pointe vers `auth.users` qui n'est PAS exposé via
  // PostgREST. Symptôme : PGRST200 sur la query → `data` à null → "Pas encore de message"
  // alors que la table en a 3+. Fix : 2 queries séparées + merge JS-side via Map.
  const { data: messagesRaw, error: msgErr } = await supabase
    .from("messages")
    .select("id, content, is_broadcast, is_muted, created_at, sender_user_id, channel_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (msgErr) {
    console.error("[Messages] failed to fetch:", msgErr.message);
  }

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
          .select("user_id, full_name, first_name, last_name, email, avatar_url")
          .in("user_id", senderIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    channelIds.length
      ? supabase
          .from("message_channels")
          .select("id, name, kind, color, position_id")
          .in("id", channelIds)
      : Promise.resolve({ data: [] as any[], error: null }),
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

  const { data: positions } = await supabase
    .from("positions")
    .select("id, name, slug, color, icon")
    .eq("event_id", ev.id)
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-display text-2xl font-bold">Messages & diffusion</h2>
        <p className="text-sm text-brand-ink/60">
          Envoyer une annonce à tous, à un poste, ou aux responsables.
        </p>
      </header>

      <BroadcastForm eventId={ev.id} positions={positions ?? []} />

      <section>
        <h3 className="mb-3 font-display text-lg font-semibold">Historique</h3>
        {messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-ink/15 bg-white/50 p-4 text-sm">
            Pas encore de message.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m: any) => {
              const senderName =
                m.sender?.full_name ??
                [m.sender?.first_name, m.sender?.last_name].filter(Boolean).join(" ") ??
                m.sender?.email ??
                null;
              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-brand-ink/10 bg-white p-3"
                  style={{ borderLeft: `4px solid ${m.channel?.color ?? "#FF5E5B"}` }}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-brand-ink/5 px-2 py-0.5 font-medium uppercase tracking-widest text-brand-ink/60">
                      {m.channel?.kind ?? "team"} · {m.channel?.name ?? "—"}
                    </span>
                    {m.is_broadcast && (
                      <span className="rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 px-2 py-0.5 font-medium text-[var(--theme-primary,_#FF5E5B)]">
                        📣 diffusion
                      </span>
                    )}
                    {m.is_muted && (
                      <span className="rounded-full bg-wellbeing-red/15 px-2 py-0.5 font-medium text-wellbeing-red">
                        🔇 mute
                      </span>
                    )}
                    {senderName && (
                      <span className="text-brand-ink/60">par {senderName}</span>
                    )}
                    <time className="ml-auto text-brand-ink/50">{formatDateTimeFr(m.created_at)}</time>
                  </div>
                  <p className="text-sm">{m.content}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
