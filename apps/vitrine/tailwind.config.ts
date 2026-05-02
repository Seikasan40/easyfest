import type { Config } from "tailwindcss";

/**
 * Tailwind config — Easyfest v4 fmono (validée Pamela 2 mai 2026).
 * Tokens v4 sous `easyfest.*`. Aliases legacy `brand.*` conservés.
 * Theming par tenant via CSS custom properties `--theme-*`.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        easyfest: {
          coral: "#FF5E5B",
          amber: "#F4B860",
          ink: "#1A1A1A",
          cream: "#FFF8F0",
          pine: "#2D5F4F",
        },
        brand: {
          coral: "#FF5E5B",
          ink: "#1A1A1A",
          cream: "#FFF8F0",
          amber: "#F4B860",
          forest: "#2D5F4F",
          sand: "#F4E8D8",
        },
        wellbeing: {
          green: "#10B981",
          yellow: "#F4B860",
          red: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "-apple-system", "sans-serif"],
        display: [
          "var(--font-source-serif)",
          "Source Serif 4",
          "Source Serif Pro",
          "Georgia",
          "serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
        squircle: "1.75rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,26,26,0.06), 0 8px 24px -8px rgba(26,26,26,0.12)",
        glow: "0 0 0 4px rgba(255,94,91,0.18)",
        "glow-amber": "0 0 0 4px rgba(244,184,96,0.22)",
      },
      animation: {
        "fade-in": "fadeIn 280ms ease-out",
        "slide-up": "slideUp 320ms ease-out",
        "pulse-soft": "pulseSoft 2.4s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
      },
      letterSpacing: {
        tagline: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;
