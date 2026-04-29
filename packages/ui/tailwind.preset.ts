/**
 * Preset Tailwind partagé entre apps/vitrine et apps/mobile (Expo Web).
 * Importer via : `presets: [require('@easyfest/ui/tailwind.preset')]`.
 */
import type { Config } from "tailwindcss";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        brand: {
          coral: "#FF5E5B",
          ink: "#1F2233",
          forest: "#2D5447",
          amber: "#F59E0B",
          cream: "#FFF4E6",
          sand: "#F5E6D3",
        },
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
    },
  },
};

export default preset;
