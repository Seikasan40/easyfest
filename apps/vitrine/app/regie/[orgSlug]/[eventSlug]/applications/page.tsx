import { formatDateTimeFr, isMinor } from "@easyfest/shared";
import { createServerClient } from "@/lib/supabase/server";
import { ApplicationsTable } from "@/components/applications-table";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function ApplicationsPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!ev) return null;

  const { data: applications } = await supabase
    .from("volunteer_applications")
    .select(`
      id, status, full_name, first_name, last_name, email, phone, birth_date, is_minor,
      arrival_at, departure_at, preferred_position_slugs, skills, limitations,
      created_at, refusal_reason, source, admin_notes
    `)
    .eq("event_id", ev.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold">Candidatures</h2>
        <p className="text-sm text-brand-ink/60">
          {(applications ?? []).length} candidature{(applications ?? []).length > 1 ? "s" : ""}
        </p>
      </header>

      <ApplicationsTable applications={applications ?? []} eventName={ev.name} />
    </div>
  );
}
