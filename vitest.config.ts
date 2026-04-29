import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.turbo/**", "**/.next/**", "apps/**/e2e/**"],
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/**/*.ts", "apps/**/*.ts", "apps/**/*.tsx"],
    },
  },
});
