import path from "node:path";
import { fileURLToPath } from "node:url";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import vitest from "eslint-plugin-vitest";
import eslintConfigPrettier from "eslint-config-prettier";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsProject = {
  project: path.join(__dirname, "tsconfig.json"),
  tsconfigRootDir: __dirname,
};

export default [
  { ignores: ["dist/", "node_modules/", "coverage/**", "vitest.config.ts"] },
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: { parser: tsParser, parserOptions: tsProject },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: tsProject,
      globals: vitest.environments.env.globals,
    },
    plugins: { "@typescript-eslint": tsPlugin, vitest },
    rules: {
      ...tsPlugin.configs["recommended"].rules,
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  // Turn off ESLint rules that conflict with Prettier (must be last).
  eslintConfigPrettier,
];
