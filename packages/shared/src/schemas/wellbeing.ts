import { z } from "zod";

import { WELLBEING_LEVELS } from "../constants/wellbeing";

export const WellbeingReportSchema = z.object({
  eventId: z.string().uuid(),
  level: z.enum(WELLBEING_LEVELS),
  comment: z.string().max(500).optional(),
});

export type WellbeingReportInput = z.infer<typeof WellbeingReportSchema>;
