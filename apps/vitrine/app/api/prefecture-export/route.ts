import { NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/prefecture-export?eventId=...
 * Génère un pack ZIP avec :
 * - liste-benevoles.csv (avec contacts d'urgence pour la préfecture)
 * - recap-event.md (récap pour la déclaration manifestation)
 * - sponsors.csv (partenaires officiels)
 * - conventions-signees.csv (audit signatures pour conformité)
 * - README.md (guide d'utilisation du pack)
 *
 * Réservé direction de l'event.
 */
export async function GET(req: Request) {
  try {
  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId manquant" }, { status: 400 });

  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Permission direction — utilise array (l'user peut avoir N rôles sur le même event,
  // .maybeSingle() throwait silencieusement si N>1).
  const { data: memberships } = await supabase
    .from("memberships")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("event_id", eventId)
    .eq("is_active", true);

  const isDirection = (memberships ?? []).some((m: any) => m.role === "direction");
  if (!isDirection) {
    return NextResponse.json({ error: "Réservé à la direction" }, { status: 403 });
  }

  // Récupérer toutes les données
  const [evRes, appsRes, sponsorsRes, signedRes, orgRes] = await Promise.all([
    supabase.from("events").select("id, name, slug, starts_at, ends_at, location, organization_id").eq("id", eventId).maybeSingle(),
    supabase.from("volunteer_applications").select("first_name, last_name, full_name, email, phone, birth_date, is_minor, address_street, address_city, address_zip, has_vehicle, driving_license, status, source").eq("event_id", eventId).order("last_name", { ascending: true }),
    supabase.from("sponsors").select("name, tier, status, contact_name, contact_email, amount_eur").eq("event_id", eventId).order("amount_eur", { ascending: false }),
    supabase.from("signed_engagements").select("user_id, engagement_kind, signed_at, version").eq("event_id", eventId).order("signed_at", { ascending: false }),
    supabase.from("events").select("organization:organization_id (name, slug, legal_siret, legal_address, president_name, president_title, contact_email, contact_phone)").eq("id", eventId).maybeSingle(),
  ]);

  const ev: any = evRes.data;
  const apps: any[] = appsRes.data ?? [];
  const sponsors: any[] = sponsorsRes.data ?? [];
  const signed: any[] = signedRes.data ?? [];
  const org: any = (orgRes.data as any)?.organization;

  if (!ev) return NextResponse.json({ error: "Event introuvable" }, { status: 404 });

  const dateFmt = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  // CSV bénévoles
  const csvBenevoles = [
    "Nom,Prenom,Email,Telephone,Date_naissance,Mineur,Adresse,Ville,CP,Vehicule,Permis_B,Statut",
    ...apps.map((a) =>
      [
        a.last_name ?? "",
        a.first_name ?? "",
        a.email ?? "",
        a.phone ?? "",
        a.birth_date ?? "",
        a.is_minor ? "OUI" : "NON",
        (a.address_street ?? "").replace(/,/g, " "),
        a.address_city ?? "",
        a.address_zip ?? "",
        a.has_vehicle ? "OUI" : "NON",
        a.driving_license ? "OUI" : "NON",
        a.status,
      ]
        .map((s) => `"${String(s).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  // CSV sponsors
  const csvSponsors = [
    "Nom,Tier,Statut,Contact,Email,Montant_EUR",
    ...sponsors.map((s) =>
      [
        s.name ?? "",
        s.tier ?? "",
        s.status ?? "",
        s.contact_name ?? "",
        s.contact_email ?? "",
        Number(s.amount_eur ?? 0).toFixed(2),
      ]
        .map((s) => `"${String(s).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  // CSV conventions
  const csvSigned = [
    "User_ID,Type_engagement,Signe_le,Version",
    ...signed.map((s) =>
      [s.user_id, s.engagement_kind, s.signed_at, s.version]
        .map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  // Récap markdown
  const totalAmount = sponsors.reduce((sum, s) => sum + Number(s.amount_eur ?? 0), 0);
  const signedConventions = signed.filter((s) => s.engagement_kind === "convention_benevolat").length;
  const minorCount = apps.filter((a) => a.is_minor).length;
  const validatedCount = apps.filter((a) => a.status === "validated").length;

  const recap = `# 📋 Pack préfecture — ${ev.name}

## Identité de la manifestation

- **Nom** : ${ev.name}
- **Dates** : du ${dateFmt(ev.starts_at)} au ${dateFmt(ev.ends_at)}
- **Lieu** : ${ev.location ?? "—"}

## Organisateur

- **Association** : ${org?.name ?? "—"}
- **SIRET** : ${org?.legal_siret ?? "—"}
- **Adresse siège** : ${org?.legal_address ?? "—"}
- **Représentée par** : ${org?.president_name ?? "—"} (${org?.president_title ?? "Président·e"})
- **Contact** : ${org?.contact_email ?? "—"} / ${org?.contact_phone ?? "—"}

## Effectifs bénévoles

| Indicateur | Valeur |
|---|---|
| Total candidatures | ${apps.length} |
| Bénévoles validés | ${validatedCount} |
| Dont mineurs | ${minorCount} |
| Conventions signées | ${signedConventions} / ${validatedCount} |
| % conventions | ${validatedCount > 0 ? Math.round((signedConventions / validatedCount) * 100) : 0}% |

## Partenaires & sponsors

- **Total partenaires** : ${sponsors.length}
- **Montant total négocié** : ${totalAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
- Voir détail dans \`sponsors.csv\`

## Conformité

- ✅ Liste nominative des bénévoles avec coordonnées (\`liste-benevoles.csv\`)
- ✅ Engagements signés avec horodatage et version (\`conventions-signees.csv\`)
- ✅ Bénévoles mineurs identifiés (colonne \`Mineur\` du CSV)
- ✅ Bénévoles avec véhicule + permis B identifiés (pour autorisations parking pro)

## Documents complémentaires à joindre (à fournir manuellement)

- [ ] Plan d'évacuation (issu du dossier sécurité)
- [ ] Attestation assurance RC organisateur
- [ ] Convention de mise à disposition du site (signée mairie)
- [ ] Avis SDIS (si > 1500 personnes)
- [ ] Programme prévisionnel de la manifestation
- [ ] Plan de circulation et parking
- [ ] Liste des prestataires sécurité

---

*Pack généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })} via Easyfest*
*Pour toute question : ${org?.contact_email ?? "—"}*
`;

  const readme = `# 📦 Pack préfecture ${ev.name}

Ce ZIP contient les documents administratifs nécessaires pour ta déclaration de manifestation
auprès de la préfecture / mairie / SDIS.

## Contenu

| Fichier | Usage |
|---|---|
| \`recap-event.md\` | Récapitulatif synthétique de l'événement (à imprimer en page de garde) |
| \`liste-benevoles.csv\` | Liste nominative complète des bénévoles avec coordonnées |
| \`sponsors.csv\` | Liste des partenaires/sponsors officiels |
| \`conventions-signees.csv\` | Trace des engagements signés (audit) |

## Comment utiliser

1. Imprime \`recap-event.md\` (open dans Word ou éditeur md)
2. Joins les CSV à ta déclaration
3. Complète avec les pièces "à fournir manuellement" listées dans le récap

## Important

Les CSV contiennent des données personnelles (RGPD). Stocke ce ZIP en local et supprime-le
après usage. Ne le diffuse pas par email non chiffré.

---

*Pack généré via Easyfest - https://easyfest.app*
`;

  // Construire le ZIP côté serveur (sans dépendance externe : implémentation manuelle simple via Buffer)
  // Pour rester léger on génère un ZIP basique avec entries non compressés (stored)
  const files = [
    { name: "README.md", content: readme },
    { name: "recap-event.md", content: recap },
    { name: "liste-benevoles.csv", content: csvBenevoles },
    { name: "sponsors.csv", content: csvSponsors },
    { name: "conventions-signees.csv", content: csvSigned },
  ];

  // Utiliser jszip dynamiquement
  let JSZipModule: any;
  try {
    JSZipModule = await import("jszip");
  } catch {
    return NextResponse.json(
      { error: "Module jszip indisponible — installe avec pnpm add jszip" },
      { status: 500 }
    );
  }
  const JSZip = JSZipModule.default ?? JSZipModule;
  const zip = new JSZip();
  for (const f of files) {
    zip.file(f.name, f.content);
  }
  const blob = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  // Audit log
  await supabase.from("audit_log").insert({
    user_id: userData.user.id,
    event_id: eventId,
    action: "prefecture.exported",
    payload: { files: files.map((f) => f.name), apps_count: apps.length },
  });

  const filename = `pack-prefecture-${ev.slug}-${new Date().toISOString().slice(0, 10)}.zip`;
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(blob.length),
      "Cache-Control": "no-store",
    },
  });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[prefecture-export] error:", err);
    return NextResponse.json(
      { error: (err as Error).message ?? "Export impossible" },
      { status: 500 },
    );
  }
}
