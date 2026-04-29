import { NextResponse, type NextRequest } from "next/server";
import { createServerClient as createSsrClient } from "@supabase/ssr";

const PROTECTED_PREFIXES = ["/v/", "/r/", "/staff/", "/regie/", "/admin/"];

export async function middleware(req: NextRequest) {
  // Maintenance mode (env)
  if (
    process.env["MAINTENANCE_MODE"] === "true" &&
    !req.nextUrl.pathname.startsWith("/maintenance") &&
    !req.nextUrl.pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/maintenance", req.url));
  }

  const path = req.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!needsAuth) return NextResponse.next();

  // Auth check via Supabase SSR
  const res = NextResponse.next();
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!url || !anonKey) return res;

  const supabase = createSsrClient(url, anonKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) res.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|fonts|manifest.json|robots.txt).*)",
  ],
};
