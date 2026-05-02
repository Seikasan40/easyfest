import { formatDateTimeFr } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function FeedPage({ params }: PageProps) {
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
      id, content, is_broadcast, created_at,
      channel:channel_id (kind, color),
      sender:sender_user_id (raw_user_meta_data)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold">Fil d'actu</h1>
        <p className="text-sm text-brand-ink/60">
          Annonces officielles de la régie et des responsables.
        </p>
      </header>

      {(messages ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-white/50 p-6 text-center">
          <p className="text-3xl">📣</p>
          <p className="mt-2 font-medium">Aucun message pour l'instant</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            Les annonces s'afficheront ici en direct.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(messages ?? []).map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-brand-ink/10 bg-white p-4"
              style={{ borderLeft: `4px solid ${(m as any).channel?.color ?? "#FF5E5B"}` }}
            >
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="rounded-full bg-brand-ink/5 px-2 py-0.5 font-medium uppercase tracking-widest text-brand-ink/60">
                  {(m as any).channel?.kind ?? "team"}
                </span>
                {m.is_broadcast && (
                  <span className="rounded-full bg-[var(--theme-primary,_#FF5E5B)]/15 px-2 py-0.5 font-medium text-[var(--theme-primary,_#FF5E5B)]">
                    📣 diffusion
                  </span>
                )}
                <time className="ml-auto text-brand-ink/50">{formatDateTimeFr(m.created_at)}</time>
              </div>
              <p className="text-sm">{m.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
