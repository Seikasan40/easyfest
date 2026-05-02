import { TenantThemeProvider } from "@/components/TenantThemeProvider";
import { createServerClient } from "@/lib/supabase/server";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}

/**
 * Layout pour les pages publiques tenant-scoped (/[orgSlug]/[eventSlug]/...) :
 * - inscription publique
 * - page billetterie
 * - page artiste, etc.
 *
 * Anonymous-safe : on lit l'organization via la table events (event status open)
 * pour résoudre l'orgId, puis on délègue au TenantThemeProvider qui passe par
 * la lecture publique scoped (RLS sur organization_themes pour les surfaces publiques).
 */
export default async function PublicTenantLayout({ children, params }: LayoutProps) {
  const { orgSlug } = await params;
  const supabase = createServerClient();

  let orgId: string | null = null;
  try {
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();
    orgId = org?.id ?? null;
  } catch {
    orgId = null;
  }

  return (
    <TenantThemeProvider organizationId={orgId} organizationSlug={orgSlug} fullHeight>
      {children}
    </TenantThemeProvider>
  );
}
