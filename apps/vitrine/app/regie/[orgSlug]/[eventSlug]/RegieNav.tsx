"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { REGIE_TABS } from "./regie-tabs";

interface Props {
  orgSlug: string;
  eventSlug: string;
}

export function RegieNav({ orgSlug, eventSlug }: Props) {
  const pathname = usePathname() ?? "";
  const base = `/regie/${orgSlug}/${eventSlug}`;

  return (
    <nav
      aria-label="Navigation régie"
      className="overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      <ul className="flex min-w-max items-center gap-1 px-4 py-2">
        {REGIE_TABS.map((tab) => {
          const href = base + tab.hrefSuffix;
          const isActive = tab.exact
            ? pathname === base || pathname === base + "/"
            : pathname.startsWith(base + tab.matchPrefix);

          return (
            <li key={tab.key}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className="inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none"
                style={{
                  background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.50)",
                  borderBottom: isActive ? "2px solid #C49A2C" : "2px solid transparent",
                  touchAction: "manipulation",
                }}
              >
                <span aria-hidden className="text-sm leading-none">{tab.emoji}</span>
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
