import { defineConfig, defaultExclude } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.ts"],
    // Stdio MCP integration test is run via `npm run test:integration` after `npm run build`.
    exclude: [...defaultExclude, "**/mcp-stdio.integration.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "dist/**",
        "node_modules/**",
        "vitest.config.ts",
        "eslint.config.js",
      ],
    },
  },
});
