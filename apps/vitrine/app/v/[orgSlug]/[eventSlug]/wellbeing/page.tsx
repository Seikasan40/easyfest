import { createServerClient } from "@/lib/supabase/server";
import { WellbeingInteractive } from "@/components/wellbeing-interactive";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function WellbeingPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name, wellbeing_enabled, safer_alerts_enabled")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: userData } = await supabase.auth.getUser();
  const { data: lastReport } = userData.user
    ? await supabase
        .from("wellbeing_reports")
        .select("id, level, created_at")
        .eq("event_id", ev.id)
        .eq("reporter_user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-5">
      <WellbeingInteractive
        eventId={ev.id}
        eventName={ev.name}
        wellbeingEnabled={ev.wellbeing_enabled}
        saferEnabled={ev.safer_alerts_enabled}
        lastLevel={lastReport?.level as "green" | "yellow" | "red" | undefined}
        lastReportedAt={lastReport?.created_at}
      />
    </div>
  );
}
