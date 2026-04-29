/**
 * Headers CORS partagés entre Edge Functions.
 * Restrictif en prod : on whiteliste easyfest.app + previews Netlify.
 */
const ALLOWED_ORIGINS = [
  "https://easyfest.app",
  "https://www.easyfest.app",
  "https://easyfest.netlify.app",
  /^https:\/\/deploy-preview-\d+--easyfest\.netlify\.app$/,
  /^https:\/\/[a-z0-9-]+--easyfest\.netlify\.app$/,
  "http://localhost:3000",
  "http://localhost:8081",
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const isAllowed =
    origin &&
    ALLOWED_ORIGINS.some((o) =>
      typeof o === "string" ? o === origin : o.test(origin),
    );
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://easyfest.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-easyfest-version",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function preflightResponse(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req.headers.get("origin")) });
  }
  return null;
}
