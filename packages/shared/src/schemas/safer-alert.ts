import { z } from "zod";

import { SAFER_ALERT_KINDS } from "../constants/safer";

export const SaferAlertSchema = z.object({
  eventId: z.string().uuid(),
  kind: z.enum(SAFER_ALERT_KINDS),
  description: z.string().max(1000).optional(),
  locationHint: z.string().max(200).optional(),
  // géolocalisation optionnelle (l'utilisateur peut refuser)
  geoLat: z.number().min(-90).max(90).optional(),
  geoLng: z.number().min(-180).max(180).optional(),
});

export type SaferAlertInput = z.infer<typeof SaferAlertSchema>;
