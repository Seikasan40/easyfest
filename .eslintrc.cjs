/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: false,
  },
  plugins: ["@typescript-eslint", "import", "tailwindcss"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:tailwindcss/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "import/order": [
      "error",
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
  },
  settings: {
    "import/resolver": {
      typescript: { alwaysTryTypes: true },
    },
    tailwindcss: {
      callees: ["cn", "cva", "clsx", "twMerge"],
      config: "apps/vitrine/tailwind.config.ts",
    },
  },
  ignorePatterns: [
    "node_modules",
    ".next",
    ".turbo",
    "dist",
    "build",
    "coverage",
    "*.config.js",
    "*.config.cjs",
    "*.config.mjs",
    "**/.expo/**",
    "**/.eas/**",
  ],
  overrides: [
    {
      files: ["**/*.test.ts", "**/*.test.tsx"],
      rules: { "@typescript-eslint/no-explicit-any": "off" },
    },
    {
      files: ["packages/db/supabase/functions/**/*.ts"],
      // Edge Functions Supabase tournent dans Deno — désactiver les règles Node
      rules: { "import/no-unresolved": "off" },
    },
  ],
};
