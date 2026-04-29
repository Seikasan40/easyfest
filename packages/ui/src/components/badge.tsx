import * as React from "react";

import { cn } from "../utils/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const toneClasses: Record<Tone, string> = {
  neutral: "bg-brand-ink/10 text-brand-ink/70",
  success: "bg-wellbeing-green/15 text-wellbeing-green",
  warning: "bg-wellbeing-yellow/15 text-wellbeing-yellow",
  danger: "bg-wellbeing-red/15 text-wellbeing-red",
  brand: "bg-brand-coral/15 text-brand-coral",
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
