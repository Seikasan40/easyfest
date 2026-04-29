/**
 * Seed users — crée 5 comptes auth.users + memberships + profiles + assignments
 * pour démarrer le test démo dimanche immédiatement.
 *
 * Usage : pnpm tsx scripts/seed-users.ts
 *
 * Pré-requis : .env.local rempli avec SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *              (Supabase local OU cloud, peu importe).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]!;
const SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const RDL_ID = "22222222-2222-2222-2222-222222222222";

interface SeedUser {
  email: string;
  password: string;
  role: "direction" | "volunteer_lead" | "post_lead" | "staff_scan" | "volunteer";
  positionSlug?: string;
  isEntryScanner?: boolean;
  isMediator?: boolean;
  profile: {
    first_name: string;
    last_name: string;
    full_name: string;
    phone: string;
    birth_date: string;
    skills?: string[];
    is_returning?: boolean;
  };
}

const SEED_USERS: SeedUser[] = [
  {
    email: "pam@easyfest.test",
    password: "easyfest-demo-2026",
    role: "direction",
    profile: {
      first_name: "Pam",
      last_name: "Morin",
      full_name: "Pam Morin",
      phone: "+33611111111",
      birth_date: "1985-03-12",
      skills: ["communication", "experience_festival"],
      is_returning: true,
    },
  },
  {
    email: "dorothee@easyfest.test",
    password: "easyfest-demo-2026",
    role: "volunteer_lead",
    profile: {
      first_name: "Dorothée",
      last_name: "Carlo",
      full_name: "Dorothée Carlo",
      phone: "+33633333333",
      birth_date: "1992-01-05",
      skills: ["communication", "experience_festival"],
      is_returning: true,
    },
  },
  {
    email: "mahaut@easyfest.test",
    password: "easyfest-demo-2026",
    role: "post_lead",
    positionSlug: "bar",
    profile: {
      first_name: "Mahaut",
      last_name: "Lefèvre",
      full_name: "Mahaut Lefèvre",
      phone: "+33622222222",
      birth_date: "1990-07-22",
      skills: ["service", "communication"],
      is_returning: true,
    },
  },
  {
    email: "antoine@easyfest.test",
    password: "easyfest-demo-2026",
    role: "staff_scan",
    isEntryScanner: true,
    profile: {
      first_name: "Antoine",
      last_name: "Loiret",
      full_name: "Antoine Loiret",
      phone: "+33655555555",
      birth_date: "1995-04-18",
      skills: ["permis_b", "manutention_lourde"],
      is_returning: false,
    },
  },
  {
    email: "lucas@easyfest.test",
    password: "easyfest-demo-2026",
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Lucas",
      last_name: "Petit",
      full_name: "Lucas Petit",
      phone: "+33611445566",
      birth_date: "1999-11-14",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "sandy@easyfest.test",
    password: "easyfest-demo-2026",
    role: "volunteer",
    positionSlug: "ateliers-animations",
    isMediator: true,
    profile: {
      first_name: "Sandy",
      last_name: "Berger",
      full_name: "Sandy Berger",
      phone: "+33611002233",
      birth_date: "1993-08-19",
      skills: ["communication"],
      is_returning: true,
    },
  },
];

async function ensureUser(seed: SeedUser): Promise<string> {
  console.log(`▸ ${seed.profile.full_name} (${seed.email})`);

  // 1. Si l'utilisateur existe déjà, le récupérer (idempotent)
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing.users.find((u) => u.email?.toLowerCase() === seed.email.toLowerCase());

  let userId: string;
  if (found) {
    userId = found.id;
    console.log(`  ↳ existant (${userId.slice(0, 8)}…)`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seed.email,
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        first_name: seed.profile.first_name,
        last_name: seed.profile.last_name,
      },
    });
    if (error || !data.user) throw new Error(`Échec création user ${seed.email}: ${error?.message}`);
    userId = data.user.id;
    console.log(`  ✓ créé (${userId.slice(0, 8)}…)`);
  }

  // 2. Profil bénévole
  await supabase.from("volunteer_profiles").upsert({
    user_id: userId,
    full_name: seed.profile.full_name,
    first_name: seed.profile.first_name,
    last_name: seed.profile.last_name,
    email: seed.email,
    phone: seed.profile.phone,
    birth_date: seed.profile.birth_date,
    skills: seed.profile.skills ?? [],
    is_returning: seed.profile.is_returning ?? false,
    consent_pii_at: new Date().toISOString(),
    consent_charter_at: new Date().toISOString(),
    consent_anti_harass_at: new Date().toISOString(),
    privacy_policy_version_accepted: "1.0.0",
  });

  // 3. Position id
  let positionId: string | null = null;
  if (seed.positionSlug) {
    const { data: pos } = await supabase
      .from("positions")
      .select("id")
      .eq("event_id", RDL_ID)
      .eq("slug", seed.positionSlug)
      .single();
    positionId = pos?.id ?? null;
  }

  // 4. Membership
  await supabase.from("memberships").upsert({
    user_id: userId,
    event_id: RDL_ID,
    role: seed.role,
    position_id: positionId,
    is_entry_scanner: seed.isEntryScanner ?? false,
    is_mediator: seed.isMediator ?? false,
    is_active: true,
    accepted_at: new Date().toISOString(),
  }, { onConflict: "user_id,event_id,role" });

  // 5. Si volunteer, on lui assigne 1 shift validé
  if (seed.role === "volunteer" && seed.positionSlug) {
    const { data: shift } = await supabase
      .from("shifts")
      .select("id")
      .eq("position_id", positionId)
      .order("starts_at", { ascending: true })
      .limit(1)
      .single();
    if (shift) {
      await supabase.from("assignments").upsert({
        shift_id: shift.id,
        volunteer_user_id: userId,
        status: "validated",
        validated_by_volunteer_at: new Date().toISOString(),
      }, { onConflict: "shift_id,volunteer_user_id" });

      // Donner 2 repas
      await supabase.from("meal_allowances").upsert([
        {
          event_id: RDL_ID,
          volunteer_user_id: userId,
          meal_slot: "vendredi-diner",
          meal_label: "Vendredi 29 mai · Dîner",
        },
        {
          event_id: RDL_ID,
          volunteer_user_id: userId,
          meal_slot: "samedi-dejeuner",
          meal_label: "Samedi 30 mai · Déjeuner",
        },
      ], { onConflict: "event_id,volunteer_user_id,meal_slot" });
    }
  }

  return userId;
}

async function main() {
  console.log("🌱 Seeding 6 users for RDL 2026…\n");

  for (const seed of SEED_USERS) {
    try {
      await ensureUser(seed);
    } catch (e) {
      console.error(`  ✗ erreur:`, e instanceof Error ? e.message : e);
    }
  }

  // Audit
  await supabase.from("audit_log").insert({
    event_id: RDL_ID,
    action: "seed.users.applied",
    payload: { count: SEED_USERS.length, names: SEED_USERS.map((u) => u.profile.full_name) },
  });

  console.log("\n✅ Seed users terminé.\n");
  console.log("📋 Comptes test (password: easyfest-demo-2026) :");
  for (const u of SEED_USERS) {
    console.log(`  ${u.role.padEnd(15)} ${u.email}  → ${u.profile.full_name}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
