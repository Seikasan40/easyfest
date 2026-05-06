"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  orgSlug: string;
  eventSlug: string;
  unreadFil?: number;
}

const NAV_ITEMS = (org: string, ev: string) => [
  {
    key: "home",
    href: `/v/${org}/${ev}`,
    label: "Accueil",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 1.8} className="h-6 w-6">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
    exact: true,
  },
  {
    key: "qr",
    href: `/v/${org}/${ev}/qr`,
    label: "Mon QR",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3" y="3" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
        <rect x="14" y="3" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
        <rect x="3" y="14" width="7" height="7" rx="1" fill={active ? "currentColor" : "none"} />
        <path d="M14 14h2v2h-2zM18 14h3v2h-3zM14 18h3v3h-3zM19 19h2v2h-2z" fill={active ? "currentColor" : "none"} stroke="none" />
      </svg>
    ),
    exact: false,
  },
  {
    key: "planning",
    href: `/v/${org}/${ev}/planning`,
    label: "Planning",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <rect x="7" y="14" width="3" height="3" rx="0.5" fill={active ? "currentColor" : "none"} />
        <rect x="14" y="14" width="3" height="3" rx="0.5" fill={active ? "currentColor" : "none"} />
      </svg>
    ),
    exact: false,
  },
  {
    key: "fil",
    href: `/v/${org}/${ev}/fil`,
    label: "Fil",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
    exact: false,
  },
  {
    key: "safer",
    href: `/v/${org}/${ev}/safer`,
    label: "Safer",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    exact: false,
  },
];

export function BottomNav({ orgSlug, eventSlug, unreadFil = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const basePath = `/v/${orgSlug}/${eventSlug}`;
  const items = NAV_ITEMS(orgSlug, eventSlug);

  const isActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    if (href === `${basePath}/fil`)
      return (
        pathname.startsWith(`${basePath}/fil`) ||
        pathname.startsWith(`${basePath}/chat`) ||
        pathname.startsWith(`${basePath}/feed`)
      );
    return pathname.startsWith(href);
  };

  return (
    <>
      {/*
       * ── Desktop (≥ md) : nav sticky en haut ───────────────────────────
       * Placée avant <main> dans le layout → sticky top-0 fonctionne
       * correctement pour coller en haut au scroll.
       */}
      <nav
        aria-label="Navigation principale"
        className="sticky top-0 z-20 hidden items-center gap-1 border-b border-proto-border bg-proto-paper px-4 py-2 md:flex"
      >
        {items.map((item) => {
          const active = isActive(item.href, item.exact ?? false);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                color: active ? "#1A3828" : "#9A9080",
                background: active ? "rgba(26,56,40,0.08)" : "transparent",
              }}
            >
              {item.key === "fil" && unreadFil > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1A3828] text-[9px] font-bold text-white">
                  {unreadFil > 9 ? "9+" : unreadFil}
                </span>
              )}
              <span className="h-5 w-5 flex-shrink-0">{item.icon(active)}</span>
              <span>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-3/4 -translate-x-1/2 rounded-full bg-[#1A3828]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/*
       * ── Mobile (< md) : nav fixée en bas du viewport ──────────────────
       * `fixed` + max-w + mx-auto pour rester centrée sur la largeur
       * de la coque 430px même si le viewport est plus large.
       * Le <main> dans le layout a un paddingBottom pour ne pas être caché
       * sous cette barre.
       */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex w-full max-w-[430px] border-t border-proto-border bg-proto-paper md:hidden"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        {items.map((item) => {
          const active = isActive(item.href, item.exact ?? false);
          return (
            <Link
              key={item.key}
              href={item.href}
              className="relative flex flex-1 flex-col items-center gap-1 pb-1 pt-3 transition-opacity"
              style={{ color: active ? "#1A3828" : "#9A9080" }}
            >
              {item.key === "fil" && unreadFil > 0 && (
                <span className="absolute right-[calc(50%-14px)] top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#1A3828] text-[9px] font-bold text-white">
                  {unreadFil > 9 ? "9+" : unreadFil}
                </span>
              )}
              {item.icon(active)}
              <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-[#1A3828]" />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
