/**
 * Schéma Zod du formulaire d'inscription bénévole — 5 étapes.
 * Source de vérité pour la validation client (Next form) ET serveur (Server Action / Edge fn).
 *
 * Étapes :
 *   1. Identité (état civil, contact)
 *   2. Logistique (dates arrivée/départ, taille T-shirt, allergies)
 *   3. Préférences postes (top 3 max)
 *   4. Compétences & limites (skills array)
 *   5. Engagements (charte, anti-harcèlement, RGPD, droit image, parental si mineur)
 */
import { z } from "zod";

import { POSITION_SLUGS, DEFAULT_MAX_PREFERRED_POSITIONS } from "../constants/positions";

// ─── Étape 1 — Identité & contact ───────────────────────────────
export const VolunteerIdentitySchema = z.object({
  firstName: z.string().min(2, "Prénom trop court").max(80),
  lastName: z.string().min(2, "Nom trop court").max(80),
  email: z.string().email("Email invalide").max(160),
  phone: z
    .string()
    .regex(/^(\+?[1-9]\d{6,14}|0\d{9})$/u, "Numéro invalide (format FR ou international)"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u, "Date au format AAAA-MM-JJ")
    .refine((d) => !Number.isNaN(Date.parse(d)), "Date invalide"),
  gender: z.enum(["M", "F", "X", "NS"]).optional(),
  addressStreet: z.string().max(200).optional(),
  addressCity: z.string().max(100).optional(),
  addressZip: z.string().max(20).optional(),
  addressCountry: z.string().length(2).default("FR"),
  profession: z.string().max(120).optional(),
});

// ─── Étape 2 — Logistique ───────────────────────────────────────
export const VolunteerLogisticsSchema = z
  .object({
    arrivalAt: z.string().datetime({ message: "Date+heure d'arrivée invalide" }),
    departureAt: z.string().datetime({ message: "Date+heure de départ invalide" }),
    size: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).optional(),
    dietNotes: z.string().max(500).optional(),
    hasVehicle: z.boolean().default(false),
    drivingLicense: z.boolean().default(false),
  })
  .refine((d) => Date.parse(d.arrivalAt) < Date.parse(d.departureAt), {
    message: "La date de départ doit être après l'arrivée",
    path: ["departureAt"],
  });

// ─── Étape 3 — Préférences postes (top N max) ──────────────────
export const VolunteerPositionPreferencesSchema = z.object({
  preferredPositionSlugs: z
    .array(z.enum(POSITION_SLUGS as [string, ...string[]]))
    .min(1, "Choisissez au moins un poste")
    .max(DEFAULT_MAX_PREFERRED_POSITIONS, `Maximum ${DEFAULT_MAX_PREFERRED_POSITIONS} postes`),
});

// ─── Étape 4 — Compétences & limites ────────────────────────────
export const VOLUNTEER_SKILLS = [
  "regie_son",
  "regie_lumiere",
  "secourisme",
  "permis_b",
  "anglais",
  "manutention_lourde",
  "cuisine",
  "service",
  "communication",
  "experience_festival",
] as const;

export const VOLUNTEER_LIMITATIONS = [
  "acrophobie",
  "claustrophobie",
  "dos_fragile",
  "genoux_fragiles",
  "audition_sensible",
  "allergie_animaux",
  "autres_limitations",
] as const;

export const VolunteerSkillsSchema = z.object({
  skills: z.array(z.enum(VOLUNTEER_SKILLS)).default([]),
  limitations: z.array(z.enum(VOLUNTEER_LIMITATIONS)).default([]),
  bio: z.string().max(500).optional(),
  isReturning: z.boolean().default(false),
});

// ─── Étape 5 — Engagements & consentements ─────────────────────
export const VolunteerConsentsSchema = z.object({
  consentCharter: z.literal(true, {
    errorMap: () => ({ message: "La charte du festival doit être acceptée" }),
  }),
  consentAntiHarassment: z.literal(true, {
    errorMap: () => ({ message: "L'engagement anti-harcèlement doit être signé" }),
  }),
  consentPii: z.literal(true, {
    errorMap: () => ({ message: "Le consentement RGPD est obligatoire" }),
  }),
  consentImage: z.boolean().default(false),
  parentalAuthUrl: z.string().url().optional(), // upload obligatoire si mineur
});

// ─── Schéma global (concaténation des 5 étapes + Turnstile token) ──
export const VolunteerApplicationSchema = z
  .object({
    eventId: z.string().uuid(),
    organizationSlug: z.string().min(1),
    eventSlug: z.string().min(1),
    turnstileToken: z.string().min(10),
  })
  .merge(VolunteerIdentitySchema)
  .merge(VolunteerLogisticsSchema._def.schema) // .refine produit un wrapper, on récupère le schema
  .merge(VolunteerPositionPreferencesSchema)
  .merge(VolunteerSkillsSchema)
  .merge(VolunteerConsentsSchema)
  .superRefine((data, ctx) => {
    // Si mineur, parental_auth_url obligatoire
    const birth = new Date(data.birthDate);
    const eighteenYearsAgo = new Date();
    eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
    const isMinor = birth > eighteenYearsAgo;
    if (isMinor && !data.parentalAuthUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentalAuthUrl"],
        message: "Autorisation parentale obligatoire pour les mineurs",
      });
    }
  });

export type VolunteerApplicationInput = z.infer<typeof VolunteerApplicationSchema>;
