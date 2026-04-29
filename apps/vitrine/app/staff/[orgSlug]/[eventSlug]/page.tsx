import { ScanInterface } from "@/components/scan-interface";
import { createServerClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

export default async function StaffScanPage({ params }: PageProps) {
  const { eventSlug } = await params;
  const supabase = createServerClient();

  const { data: ev } = await supabase
    .from("events")
    .select("id, name")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (!ev) return null;

  return <ScanInterface eventId={ev.id} eventName={ev.name} />;
}
