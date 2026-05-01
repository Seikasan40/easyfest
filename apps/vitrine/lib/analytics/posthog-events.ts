/**
 * Constantes des events PostHog tracés par Easyfest.
 * Centraliser ici pour éviter les typos cross-fichiers et garder un dictionnaire
 * stable côté analytics (les renaming d'events cassent les dashboards).
 */
export const PH_EVENTS = {
  // OC-01 onboarding self-service direction
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed", // props: step
  ONBOARDING_ORG_CREATED: "onboarding_org_created", // props: template_slug
  ONBOARDING_TEAM_INVITED: "onboarding_team_invited", // props: count
  ONBOARDING_DONE: "onboarding_done",

  // OC-04 / OC-05 RGPD
  ACCOUNT_EXPORT_DOWNLOADED: "account_export_downloaded",
  ACCOUNT_DELETION_REQUESTED: "account_deletion_requested",
  ACCOUNT_DELETION_CANCELLED: "account_deletion_cancelled",

  // Bénévoles existants (référencés depuis les pages /v et /regie)
  VOLUNTEER_APPLICATION_SUBMITTED: "volunteer_application_submitted",
  VOLUNTEER_QR_GENERATED: "volunteer_qr_generated",
  STAFF_SCAN_PERFORMED: "staff_scan_performed",
} as const;

export type PostHogEvent = (typeof PH_EVENTS)[keyof typeof PH_EVENTS];
