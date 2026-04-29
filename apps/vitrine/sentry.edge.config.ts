/**
 * Sentry edge runtime config — middleware + Edge route handlers.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env["NEXT_PUBLIC_SENTRY_DSN_WEB"];

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0.05,
    environment: process.env["NODE_ENV"] ?? "development",
  });
}
