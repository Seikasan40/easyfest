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

  const { data: messages } = await supabase
    .from("messages")
    .select(`
      id, content, is_broadcast, is_muted, created_at,
      channel:channel_id (id, name, kind, color, position_id),
      sender:sender_user_id (raw_user_meta_data)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

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
        {(messages ?? []).length === 0 ? (
          <p className="rounded-xl border border-dashed border-brand-ink/15 bg-white/50 p-4 text-sm">
            Pas encore de message.
          </p>
        ) : (
          <ul className="space-y-2">
            {(messages ?? []).map((m: any) => (
              <li
                key={m.id}
                className="rounded-xl border border-brand-ink/10 bg-white p-3"
                style={{ borderLeft: `4px solid ${m.channel?.color ?? "#FF5E5B"}` }}
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-brand-ink/5 px-2 py-0.5 font-medium uppercase tracking-widest text-brand-ink/60">
                    {m.channel?.kind} · {m.channel?.name}
                  </span>
                  {m.is_broadcast && (
                    <span className="rounded-full bg-brand-coral/15 px-2 py-0.5 font-medium text-brand-coral">
                      📣 diffusion
                    </span>
                  )}
                  {m.is_muted && (
                    <span className="rounded-full bg-wellbeing-red/15 px-2 py-0.5 font-medium text-wellbeing-red">
                      🔇 mute
                    </span>
                  )}
                  <time className="ml-auto text-brand-ink/50">{formatDateTimeFr(m.created_at)}</time>
                </div>
                <p className="text-sm">{m.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
