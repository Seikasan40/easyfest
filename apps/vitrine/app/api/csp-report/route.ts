/**
 * Endpoint CSP report — collecte les violations de Content Security Policy.
 * Pas d'auth (intentionnel — les browsers POST sans cookies).
 */
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const text = await req.text();
    if (text) {
      // En prod : envoyer à Sentry ou Logflare. En dev : console.warn.
      // eslint-disable-next-line no-console
      console.warn("[CSP report]", text.substring(0, 1000));
    }
  } catch {
    // ignore
  }
  return new NextResponse(null, { status: 204 });
}
