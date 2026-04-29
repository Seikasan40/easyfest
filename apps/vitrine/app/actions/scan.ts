"use server";

import { createServerClient } from "@/lib/supabase/server";

interface VerifyInput {
  token: string;
  eventId: string;
  scanKind: "arrival" | "meal" | "post_take";
  context?: Record<string, unknown>;
}

export async function verifyScan(input: VerifyInput) {
  const supabase = createServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { ok: false, replay: false, scan_kind: input.scanKind, error: "Non authentifié" };
  }

  const { data, error } = await supabase.functions.invoke("qr_verify", {
    body: {
      token: input.token,
      scan_kind: input.scanKind,
      context: input.context ?? {},
    },
  });

  if (error) {
    return { ok: false, replay: false, scan_kind: input.scanKind, error: error.message };
  }
  return data;
}
