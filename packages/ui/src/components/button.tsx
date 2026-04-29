import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../utils/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary: "bg-brand-coral text-white hover:opacity-90 focus:ring-brand-coral/40 shadow-soft",
        secondary: "bg-brand-ink text-white hover:opacity-90 focus:ring-brand-ink/30",
        outline: "border border-brand-ink/20 bg-white/80 text-brand-ink hover:bg-white focus:ring-brand-ink/20",
        ghost: "text-brand-ink hover:bg-brand-ink/5",
        danger: "bg-wellbeing-red text-white hover:opacity-90 focus:ring-wellbeing-red/40",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
  },
);
Button.displayName = "Button";
