import { defineConfig } from "vitest/config";

/** Runs only MCP stdio integration tests (needs `dist/` from `npm run build`). */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/mcp-stdio.integration.test.ts"],
  },
});
