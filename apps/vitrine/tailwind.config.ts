import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Easyfest — earth-tones premium (validée par Pam, démo HTML)
        brand: {
          coral: "#FF5E5B",
          ink: "#1F2233",
          forest: "#2D5447",
          amber: "#F59E0B",
          cream: "#FFF4E6",
          sand: "#F5E6D3",
        },
        // Niveaux bien-être (vert/jaune/rouge)
        wellbeing: {
          green: "#10B981",
          yellow: "#F59E0B",
          red: "#EF4444",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(31,34,51,0.06), 0 8px 24px -8px rgba(31,34,51,0.12)",
        glow: "0 0 0 4px rgba(255,94,91,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 280ms ease-out",
        "slide-up": "slideUp 320ms ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
