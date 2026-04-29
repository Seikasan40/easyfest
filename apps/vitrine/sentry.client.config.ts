/**
 * Sentry client config — front-end Next.js.
 * `beforeSend` scrub les PII listées dans PII_SCRUB_FIELDS env var.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env["NEXT_PUBLIC_SENTRY_DSN_WEB"];
const PII_FIELDS = (process.env["PII_SCRUB_FIELDS"] ?? "phone,email,birth_date,address_street,address_city,address_zip,diet_notes,parental_auth_url")
  .split(",")
  .map((s) => s.trim().toLowerCase());

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    environment: process.env["NODE_ENV"] ?? "development",
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    beforeSend(event) {
      // Scrub PII in event payload
      const scrub = (obj: unknown): unknown => {
        if (!obj || typeof obj !== "object") return obj;
        if (Array.isArray(obj)) return obj.map(scrub);
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (PII_FIELDS.includes(k.toLowerCase())) {
            out[k] = "[redacted]";
          } else if (typeof v === "object") {
            out[k] = scrub(v);
          } else {
            out[k] = v;
          }
        }
        return out;
      };

      if (event.request?.data) event.request.data = scrub(event.request.data) as any;
      if (event.extra) event.extra = scrub(event.extra) as Record<string, unknown>;
      if (event.user) {
        // Garder user.id pour debug, retirer email/username/ip
        event.user = { id: event.user.id };
      }

      // Scrub URLs containing emails
      const requestUrl = event.request?.url;
      if (requestUrl && typeof requestUrl === "string") {
        event.request!.url = requestUrl.replace(/[\w._+-]+@[\w.-]+\.[a-z]{2,}/giu, "[email]");
      }

      return event;
    },
  });
}
