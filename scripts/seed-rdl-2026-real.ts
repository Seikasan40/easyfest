/**
 * Seed RÉEL — 62 comptes RDL 2026
 * Crée tous les auth.users + volunteer_profiles + memberships
 * sans confirmation email requise.
 *
 * Usage : depuis apps/vitrine/
 *   pnpm tsx ../../scripts/seed-rdl-2026-real.ts
 *
 * Pré-requis : .env.local avec NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
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
const DEFAULT_PASSWORD = "RdlFest@2026";

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
    phone?: string | null;
    birth_date?: string | null;
    skills?: string[];
    is_returning?: boolean;
    is_minor?: boolean;
  };
}

const SEED_USERS: SeedUser[] = [
  // ─── DIRECTION ──────────────────────────────────────────────
  {
    email: "pameach@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "direction",
    profile: {
      first_name: "Pamela",
      last_name: "Leach",
      full_name: "Pamela Leach",
      phone: "0603546756",
      birth_date: "1982-05-08",
      skills: ["direction", "communication", "experience_festival"],
      is_returning: true,
    },
  },

  // ─── VOLUNTEER LEAD ─────────────────────────────────────────
  {
    email: "sandy.oliviero@rdl2026.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer_lead",
    profile: {
      first_name: "Sandy",
      last_name: "Oliviero",
      full_name: "Sandy Oliviero",
      phone: null,
      birth_date: null,
      skills: ["communication", "experience_festival"],
      is_returning: true,
    },
  },

  // ─── POST LEADS ─────────────────────────────────────────────
  {
    email: "windalmahaut@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "bar",
    profile: {
      first_name: "Mahaut",
      last_name: "Windal",
      full_name: "Mahaut Windal",
      phone: "0616657570",
      birth_date: "1989-05-29",
      skills: ["service", "communication"],
      is_returning: true,
    },
  },
  {
    email: "chionstephane1@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "bar",
    profile: {
      first_name: "Stéphane",
      last_name: "Chion",
      full_name: "Stéphane Chion",
      phone: "0652918910",
      birth_date: "1988-06-20",
      skills: ["service", "communication"],
      is_returning: true,
    },
  },
  {
    email: "fieschi.fred@free.fr",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "bar",
    profile: {
      first_name: "Frédéric",
      last_name: "Fieschi",
      full_name: "Frédéric Fieschi",
      phone: "0615775126",
      birth_date: "1972-12-06",
      skills: ["service", "communication"],
      is_returning: true,
    },
  },
  {
    email: "antoine.courtadon67@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "bar",
    profile: {
      first_name: "Antoine",
      last_name: "Courtadon",
      full_name: "Antoine Courtadon",
      phone: "0645616110",
      birth_date: "1988-07-16",
      skills: ["service", "communication"],
      is_returning: true,
    },
  },
  {
    email: "willychataigner@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "scan-bracelet",
    profile: {
      first_name: "Willy",
      last_name: "Chataigner",
      full_name: "Willy Chataigner",
      phone: "0638970433",
      birth_date: "1975-03-01",
      skills: ["accueil", "experience_festival"],
      is_returning: true,
      isEntryScanner: true,
    } as SeedUser["profile"] & { isEntryScanner?: boolean },
  },
  {
    email: "giordanengok@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "caisse-billetterie",
    profile: {
      first_name: "Fabio",
      last_name: "Giordanengo",
      full_name: "Fabio Giordanengo",
      phone: "0642226310",
      birth_date: "2003-08-10",
      skills: ["caisse", "accueil"],
      is_returning: true,
    },
  },
  {
    email: "christinedupoyet@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "caisse-jetons",
    profile: {
      first_name: "Christine",
      last_name: "Dupoyet",
      full_name: "Christine Dupoyet",
      phone: "0611208410",
      birth_date: "1969-09-07",
      skills: ["caisse", "accueil"],
      is_returning: true,
    },
  },
  {
    email: "eli.fiona@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "caisse-jetons",
    profile: {
      first_name: "Fiona",
      last_name: "Eli",
      full_name: "Fiona Eli",
      phone: "0609392264",
      birth_date: "1982-10-22",
      skills: ["caisse", "accueil"],
      is_returning: true,
    },
  },
  {
    email: "flore22ange@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "loges",
    profile: {
      first_name: "Flora",
      last_name: "Angelvy",
      full_name: "Flora Angelvy",
      phone: "0660645813",
      birth_date: "1977-04-22",
      skills: ["loges", "communication"],
      is_returning: true,
    },
  },
  {
    email: "positiv.heart.force@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "loges",
    profile: {
      first_name: "Vincent",
      last_name: "Trezza",
      full_name: "Vincent Trezza",
      phone: "0638772557",
      birth_date: "1966-01-25",
      skills: ["loges", "technique"],
      is_returning: true,
    },
  },
  {
    email: "dorotheemaire@yahoo.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "ateliers-animations",
    isMediator: true,
    profile: {
      first_name: "Dorothée",
      last_name: "Maire",
      full_name: "Dorothée Maire",
      phone: "0619164649",
      birth_date: null,
      skills: ["animation", "communication"],
      is_returning: true,
    },
  },
  {
    email: "valoufil@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "merch",
    profile: {
      first_name: "Valérie",
      last_name: "Fillinger",
      full_name: "Valérie Fillinger",
      phone: "0613542406",
      birth_date: "1972-04-30",
      skills: ["merch", "communication"],
      is_returning: true,
    },
  },
  {
    email: "christellebrouant@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "camping",
    profile: {
      first_name: "Christelle",
      last_name: "Brouant",
      full_name: "Christelle Brouant",
      phone: "0610139019",
      birth_date: "1973-02-03",
      skills: ["camping", "accueil"],
      is_returning: true,
    },
  },
  {
    email: "jeanphilippe.chacon@rdl2026.fr",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "catering",
    profile: {
      first_name: "Jean-Philippe",
      last_name: "Chacon",
      full_name: "Jean-Philippe Chacon",
      phone: null,
      birth_date: null,
      skills: ["catering", "cuisine"],
      is_returning: true,
    },
  },
  {
    email: "rogerlandi988@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "parking",
    profile: {
      first_name: "Roger",
      last_name: "Landi",
      full_name: "Roger Landi",
      phone: "0626447622",
      birth_date: "1957-11-26",
      skills: ["parking", "securite"],
      is_returning: true,
    },
  },
  {
    email: "gael@rdl2026.fr",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "backline",
    profile: {
      first_name: "Gaël",
      last_name: "",
      full_name: "Gaël",
      phone: null,
      birth_date: null,
      skills: ["backline", "technique"],
      is_returning: true,
    },
  },
  {
    email: "mario@rdl2026.fr",
    password: DEFAULT_PASSWORD,
    role: "post_lead",
    positionSlug: "run",
    profile: {
      first_name: "Mario",
      last_name: "",
      full_name: "Mario",
      phone: null,
      birth_date: null,
      skills: ["run", "logistique"],
      is_returning: true,
    },
  },

  // ─── BÉNÉVOLES ──────────────────────────────────────────────
  {
    email: "pascalknisy@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "backline",
    profile: {
      first_name: "Pascal",
      last_name: "Knisy",
      full_name: "Pascal Knisy",
      phone: "0662773752",
      birth_date: "1966-02-03",
      skills: ["backline", "technique"],
      is_returning: true,
    },
  },
  {
    email: "s.ancarani@hotmail.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "catering",
    profile: {
      first_name: "Stéphanie",
      last_name: "Taramino",
      full_name: "Stéphanie Taramino",
      phone: "0675997092",
      birth_date: "1972-03-18",
      skills: ["catering", "cuisine"],
      is_returning: true,
    },
  },
  {
    email: "luccaetlilou@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "merch",
    profile: {
      first_name: "Laetitia",
      last_name: "Lucca",
      full_name: "Laetitia Lucca",
      phone: "0647947731",
      birth_date: "1979-08-31",
      skills: ["merch", "communication"],
      is_returning: false,
    },
  },
  {
    email: "douradolana1@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Lana",
      last_name: "Dourado",
      full_name: "Lana Dourado",
      phone: "0643701007",
      birth_date: "2007-02-16",
      skills: ["accueil"],
      is_returning: false,
      is_minor: true,
    },
  },
  {
    email: "ameliepaillette06@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Amélie",
      last_name: "Paillette",
      full_name: "Amélie Paillette",
      phone: "0680961953",
      birth_date: "1984-01-22",
      skills: ["accueil"],
      is_returning: false,
    },
  },
  {
    email: "tessadly@live.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "backline",
    profile: {
      first_name: "Tess",
      last_name: "Sellouma",
      full_name: "Tess Sellouma",
      phone: "0625325705",
      birth_date: "1980-01-14",
      skills: ["backline", "technique"],
      is_returning: false,
    },
  },
  {
    email: "jessiebercher@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Jessie",
      last_name: "Bercher",
      full_name: "Jessie Bercher",
      phone: "0610505848",
      birth_date: "1996-07-29",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "menbatimefi06@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "brigade-verte",
    profile: {
      first_name: "Lionel",
      last_name: "Grasso",
      full_name: "Lionel Grasso",
      phone: "0635252582",
      birth_date: "1974-05-22",
      skills: ["manutention_lourde", "nettoyage"],
      is_returning: false,
    },
  },
  {
    email: "davsilva83310@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "David",
      last_name: "Silva",
      full_name: "David Silva",
      phone: "0658634694",
      birth_date: "1981-09-21",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "deschamps.alexandrine@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Alexandrine",
      last_name: "Deschamps",
      full_name: "Alexandrine Deschamps",
      phone: "0783023286",
      birth_date: "1993-09-20",
      skills: ["accueil"],
      is_returning: false,
    },
  },
  {
    email: "diopy679@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "parking",
    profile: {
      first_name: "Yaya",
      last_name: "Diop",
      full_name: "Yaya Diop",
      phone: "0754291258",
      birth_date: "1983-11-15",
      skills: ["parking", "permis_b"],
      is_returning: false,
    },
  },
  {
    email: "dorothyperrier@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "catering",
    profile: {
      first_name: "Dorothy",
      last_name: "Perrier",
      full_name: "Dorothy Perrier",
      phone: "0758747845",
      birth_date: "1978-04-28",
      skills: ["catering", "cuisine"],
      is_returning: false,
    },
  },
  {
    email: "marine.gillosi@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Marine",
      last_name: "Gillosi",
      full_name: "Marine Gillosi",
      phone: "0627301174",
      birth_date: "1992-01-05",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "arnaud.loiret06@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Arnaud",
      last_name: "Loiret",
      full_name: "Arnaud Loiret",
      phone: "0648127469",
      birth_date: "1995-01-24",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "noa.levasseur08@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-billetterie",
    profile: {
      first_name: "Noa",
      last_name: "Levasseur",
      full_name: "Noa Levasseur",
      phone: "0777797863",
      birth_date: "2008-10-20",
      skills: ["caisse", "accueil"],
      is_returning: false,
      is_minor: true,
    },
  },
  {
    email: "aweedo@hotmail.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "jeremy-besset-equipe",
    profile: {
      first_name: "David",
      last_name: "Milville",
      full_name: "David Milville",
      phone: "0745261836",
      birth_date: "1977-12-27",
      skills: ["backline", "technique"],
      is_returning: false,
    },
  },
  {
    email: "xchamina@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Xavier",
      last_name: "Chaminade",
      full_name: "Xavier Chaminade",
      phone: "0662330731",
      birth_date: "1980-08-13",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "m.lahoundere@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "brigade-verte",
    profile: {
      first_name: "Myriam",
      last_name: "Lahoundere",
      full_name: "Myriam Lahoundere",
      phone: "0612575021",
      birth_date: "1971-07-21",
      skills: ["nettoyage"],
      is_returning: false,
    },
  },
  {
    email: "harminidory@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "brigade-verte",
    profile: {
      first_name: "Harmony",
      last_name: "Santuré",
      full_name: "Harmony Santuré",
      phone: "0687314774",
      birth_date: "1988-11-24",
      skills: ["nettoyage"],
      is_returning: false,
    },
  },
  {
    email: "13bosquet@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "signaletique",
    profile: {
      first_name: "Barbara",
      last_name: "Bosquet",
      full_name: "Barbara Bosquet",
      phone: "0668682910",
      birth_date: "1986-05-21",
      skills: ["signaletique"],
      is_returning: false,
    },
  },
  {
    email: "marjorieyon83@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "merch",
    profile: {
      first_name: "Marjorie",
      last_name: "Yon",
      full_name: "Marjorie Yon",
      phone: "0603836094",
      birth_date: "1975-07-28",
      skills: ["merch", "communication"],
      is_returning: false,
    },
  },
  {
    email: "matt.berthod@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Matthieu",
      last_name: "Berthod",
      full_name: "Matthieu Berthod",
      phone: "0674292006",
      birth_date: "1977-12-17",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "fgp.fuentes@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Fabien",
      last_name: "Fuentes",
      full_name: "Fabien Fuentes",
      phone: "0672996229",
      birth_date: "1981-03-29",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "elisemalfoy@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Elise",
      last_name: "Malfoy",
      full_name: "Elise Malfoy",
      phone: "0667449788",
      birth_date: "1997-03-19",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "camille.jar06@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Camille",
      last_name: "Jarosz",
      full_name: "Camille Jarosz",
      phone: "0753531254",
      birth_date: "2002-06-05",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "ingrid.jar03@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Ingrid",
      last_name: "Jarosz",
      full_name: "Ingrid Jarosz",
      phone: "0745998503",
      birth_date: "1992-04-03",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "knippaurelien@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "bar",
    profile: {
      first_name: "Aurélien",
      last_name: "Knipp",
      full_name: "Aurélien Knipp",
      phone: "0695358422",
      birth_date: "1997-04-09",
      skills: ["service"],
      is_returning: false,
    },
  },
  {
    email: "laurent.brossier.83@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "backline",
    profile: {
      first_name: "Laurent",
      last_name: "Brossier",
      full_name: "Laurent Brossier",
      phone: "0618029464",
      birth_date: "1988-05-10",
      skills: ["backline", "technique"],
      is_returning: false,
    },
  },
  {
    email: "stephanie.pierre1208@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "catering",
    profile: {
      first_name: "Stéphanie",
      last_name: "Robin",
      full_name: "Stéphanie Robin",
      phone: "0625407318",
      birth_date: "1969-08-12",
      skills: ["catering", "cuisine"],
      is_returning: false,
    },
  },
  {
    email: "sophie.robinet83@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "catering",
    profile: {
      first_name: "Sophie",
      last_name: "Robinet",
      full_name: "Sophie Robinet",
      phone: "0622893167",
      birth_date: "1988-06-27",
      skills: ["catering", "cuisine"],
      is_returning: false,
    },
  },
  {
    email: "dalmasso.elodie@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-jetons",
    profile: {
      first_name: "Elodie",
      last_name: "Dalmasso",
      full_name: "Elodie Dalmasso",
      phone: "0614580756",
      birth_date: "1991-09-24",
      skills: ["caisse"],
      is_returning: false,
    },
  },
  {
    email: "celzanella@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "ateliers-animations",
    isMediator: true,
    profile: {
      first_name: "Céline",
      last_name: "Zanella",
      full_name: "Céline Zanella",
      phone: "0603263282",
      birth_date: "1979-04-21",
      skills: ["animation", "communication"],
      is_returning: false,
    },
  },
  {
    email: "margot06.lanier@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "ateliers-animations",
    isMediator: true,
    profile: {
      first_name: "Margot",
      last_name: "Lanier",
      full_name: "Margot Lanier",
      phone: "0613372084",
      birth_date: "2006-10-30",
      skills: ["animation"],
      is_returning: false,
      is_minor: true,
    },
  },
  {
    email: "mellelor@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "ateliers-animations",
    isMediator: true,
    profile: {
      first_name: "Laure",
      last_name: "Bien aimée Poterlot",
      full_name: "Laure Bien aimée Poterlot",
      phone: "0649081820",
      birth_date: null,
      skills: ["animation"],
      is_returning: false,
    },
  },
  {
    email: "claire.lavalou@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-billetterie",
    profile: {
      first_name: "Claire",
      last_name: "Lavalou",
      full_name: "Claire Lavalou",
      phone: "0782630103",
      birth_date: "2003-11-12",
      skills: ["caisse", "accueil"],
      is_returning: false,
    },
  },
  {
    email: "venus06gio@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Venus",
      last_name: "Giordanengo",
      full_name: "Venus Giordanengo",
      phone: "0647447249",
      birth_date: null,
      skills: ["accueil"],
      is_returning: false,
    },
  },
  {
    email: "samantha.carlo@hotmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-billetterie",
    profile: {
      first_name: "Samantha",
      last_name: "Carlo",
      full_name: "Samantha Carlo",
      phone: "0641529966",
      birth_date: "1990-07-09",
      skills: ["caisse", "accueil"],
      is_returning: false,
    },
  },
  {
    email: "cedric.eaubelle@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Cédric",
      last_name: "Eaubelle",
      full_name: "Cédric Eaubelle",
      phone: "0665081601",
      birth_date: "1977-10-05",
      skills: ["accueil"],
      is_returning: false,
    },
  },
  {
    email: "romuald.dourado@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "scan-bracelet",
    isEntryScanner: true,
    profile: {
      first_name: "Romuald",
      last_name: "Dourado",
      full_name: "Romuald Dourado",
      phone: "0617937321",
      birth_date: null,
      skills: ["accueil"],
      is_returning: false,
    },
  },
  {
    email: "sandra.lana@hotmail.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-jetons",
    profile: {
      first_name: "Sandra",
      last_name: "Dourado",
      full_name: "Sandra Dourado",
      phone: "0620735843",
      birth_date: null,
      skills: ["caisse"],
      is_returning: false,
    },
  },
  {
    email: "morgane_calais@yahoo.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "caisse-jetons",
    profile: {
      first_name: "Morgane",
      last_name: "Calais",
      full_name: "Morgane Calais",
      phone: "0658695162",
      birth_date: "1994-10-08",
      skills: ["caisse"],
      is_returning: false,
    },
  },
  {
    email: "je.calvini@gmail.com",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "jeremy-besset-equipe",
    profile: {
      first_name: "Jérôme",
      last_name: "Calvini",
      full_name: "Jérôme Calvini",
      phone: "0650509775",
      birth_date: "1989-02-16",
      skills: ["backline", "technique"],
      is_returning: false,
    },
  },
  {
    email: "djonny.celine@hotmail.fr",
    password: DEFAULT_PASSWORD,
    role: "volunteer",
    positionSlug: "brigade-verte",
    profile: {
      first_name: "Vanique",
      last_name: "Farade",
      full_name: "Vanique Farade",
      phone: "0673253669",
      birth_date: "1985-01-18",
      skills: ["nettoyage"],
      is_returning: false,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────

async function ensureUser(seed: SeedUser): Promise<string> {
  console.log(`▸ ${seed.profile.full_name} (${seed.email})`);

  // 1. Idempotent — chercher si l'utilisateur existe déjà
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing.users.find(
    (u) => u.email?.toLowerCase() === seed.email.toLowerCase()
  );

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
    if (error || !data.user) {
      throw new Error(`Échec création user ${seed.email}: ${error?.message}`);
    }
    userId = data.user.id;
    console.log(`  ✓ créé (${userId.slice(0, 8)}…)`);
  }

  // 2. Profil bénévole
  const { error: profileErr } = await supabase.from("volunteer_profiles").upsert(
    {
      user_id: userId,
      full_name: seed.profile.full_name,
      first_name: seed.profile.first_name,
      last_name: seed.profile.last_name,
      email: seed.email,
      phone: seed.profile.phone ?? null,
      birth_date: seed.profile.birth_date ?? null,
      skills: seed.profile.skills ?? [],
      is_returning: seed.profile.is_returning ?? false,
      is_minor: (seed.profile as any).is_minor ?? false,
      consent_pii_at: new Date().toISOString(),
      consent_charter_at: new Date().toISOString(),
      consent_anti_harass_at: new Date().toISOString(),
      privacy_policy_version_accepted: "1.0.0",
    },
    { onConflict: "user_id" }
  );
  if (profileErr) console.warn(`  ⚠ volunteer_profiles: ${profileErr.message}`);

  // 3. Position id
  let positionId: string | null = null;
  if (seed.positionSlug) {
    const { data: pos, error: posErr } = await supabase
      .from("positions")
      .select("id")
      .eq("event_id", RDL_ID)
      .eq("slug", seed.positionSlug)
      .single();
    if (posErr) {
      console.warn(`  ⚠ position "${seed.positionSlug}" introuvable: ${posErr.message}`);
    } else {
      positionId = pos?.id ?? null;
    }
  }

  // 4. Membership
  const { error: memberErr } = await supabase.from("memberships").upsert(
    {
      user_id: userId,
      event_id: RDL_ID,
      role: seed.role,
      position_id: positionId,
      is_entry_scanner: seed.isEntryScanner ?? false,
      is_mediator: seed.isMediator ?? false,
      is_active: true,
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "user_id,event_id,role" }
  );
  if (memberErr) console.warn(`  ⚠ memberships: ${memberErr.message}`);

  // 5. Pour les bénévoles : assigner le 1er shift validé
  if (seed.role === "volunteer" && positionId) {
    const { data: shift } = await supabase
      .from("shifts")
      .select("id")
      .eq("position_id", positionId)
      .order("starts_at", { ascending: true })
      .limit(1)
      .single();

    if (shift) {
      const { error: assignErr } = await supabase.from("assignments").upsert(
        {
          shift_id: shift.id,
          volunteer_user_id: userId,
          status: "validated",
          validated_by_volunteer_at: new Date().toISOString(),
        },
        { onConflict: "shift_id,volunteer_user_id" }
      );
      if (assignErr) console.warn(`  ⚠ assignments: ${assignErr.message}`);

      // 6. Repas — vendredi dîner + samedi déjeuner
      const { error: mealErr } = await supabase.from("meal_allowances").upsert(
        [
          {
            event_id: RDL_ID,
            volunteer_user_id: userId,
            meal_slot: "vendredi-diner",
            meal_label: "Vendredi 30 mai · Dîner",
          },
          {
            event_id: RDL_ID,
            volunteer_user_id: userId,
            meal_slot: "samedi-dejeuner",
            meal_label: "Samedi 31 mai · Déjeuner",
          },
        ],
        { onConflict: "event_id,volunteer_user_id,meal_slot" }
      );
      if (mealErr) console.warn(`  ⚠ meal_allowances: ${mealErr.message}`);
    } else {
      console.warn(`  ⚠ aucun shift trouvé pour position ${seed.positionSlug}`);
    }
  }

  return userId;
}

async function main() {
  console.log(`🌱 Seed RDL 2026 — ${SEED_USERS.length} utilisateurs\n`);
  console.log(`📡 Supabase: ${SUPABASE_URL}\n`);

  const results: { name: string; email: string; ok: boolean }[] = [];

  for (const seed of SEED_USERS) {
    try {
      await ensureUser(seed);
      results.push({ name: seed.profile.full_name, email: seed.email, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ erreur: ${msg}`);
      results.push({ name: seed.profile.full_name, email: seed.email, ok: false });
    }
  }

  // Audit log
  const ok = results.filter((r) => r.ok).length;
  const ko = results.filter((r) => !r.ok).length;

  await supabase.from("audit_log").insert({
    event_id: RDL_ID,
    action: "seed.rdl2026.users.applied",
    payload: {
      total: SEED_USERS.length,
      ok,
      ko,
      names: SEED_USERS.map((u) => u.profile.full_name),
    },
  });

  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅ Terminé : ${ok} OK  /  ${ko} erreurs\n`);
  console.log(`🔑 Mot de passe par défaut : ${DEFAULT_PASSWORD}\n`);
  console.log(`📋 Récapitulatif :`);
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`  ${icon}  ${r.name.padEnd(35)} ${r.email}`);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
