import * as React from "react";

import { cn } from "../utils/cn";

interface Props {
  label: string;
  subtitle: string;
  href: string;
  emoji: string;
  className?: string;
}

export function RoleCard({ label, subtitle, href, emoji, className }: Props) {
  return (
    <a
      href={href}
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-brand-ink/10 bg-white/70 p-5 shadow-soft transition hover:border-brand-coral/40 hover:bg-white hover:shadow-glow",
        className,
      )}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-coral/15 text-2xl">
        {emoji}
      </span>
      <div className="flex-1">
        <p className="font-display text-lg font-semibold leading-tight">{label}</p>
        <p className="text-sm text-brand-ink/60">{subtitle}</p>
      </div>
      <span aria-hidden className="text-brand-ink/30 group-hover:text-brand-coral">→</span>
    </a>
  );
}
