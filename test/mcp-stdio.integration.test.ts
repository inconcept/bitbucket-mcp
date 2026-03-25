/**
 * MCP stdio integration tests: real subprocess (node dist/index.js), real SDK Client +
 * StdioClientTransport, and a loopback HTTP stub for Bitbucket (child process does not
 * inherit Vitest's fetch mocks). Run `npm run build` then `npm run test:integration` if dist/ is missing.
 */
import { createServer as createHttpServer } from "node:http";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, beforeAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PAGE_SIZE } from "../src/tools/constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const distIndexPath = path.join(projectRoot, "dist/index.js");

/** `StdioClientTransport` requires `Record<string, string>`; `process.env` values may be undefined. */
function toStringRecord(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((e): e is [string, string] => e[1] !== undefined),
  );
}

/** Minimal Bitbucket API JSON for GET /repositories/{workspace} (paged list). */
const bitbucketReposListBody = JSON.stringify({
  size: 0,
  page: 1,
  pagelen: PAGE_SIZE,
  values: [],
});

describe("MCP stdio (subprocess + SDK client)", () => {
  beforeAll(() => {
    if (!existsSync(distIndexPath)) {
      throw new Error(
        "MCP stdio integration tests require dist/index.js. Run `npm run build` then `npm run test:integration`.",
      );
    }
  });

  it(
    "connects over stdio, lists tools, and calls list_repositories against a stub HTTP API",
    { timeout: 30_000 },
    async () => {
      const workspace = "stdio-test-ws";

      // Stub Bitbucket REST: BitbucketClient uses `${BITBUCKET_BASE_URL}${path}`.
      const httpServer = createHttpServer((req, res) => {
        if (req.method !== "GET" || !req.url?.startsWith(`/repositories/${workspace}`)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "not found" } }));
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(bitbucketReposListBody);
      });

      const port: number = await new Promise((resolve, reject) => {
        httpServer.listen(0, "127.0.0.1", () => {
          const addr = httpServer.address();
          if (addr && typeof addr === "object") resolve(addr.port);
          else reject(new Error("expected TCP address with port"));
        });
        httpServer.on("error", reject);
      });

      const baseUrl = `http://127.0.0.1:${port}`;

      const childEnv = toStringRecord({
        ...process.env,
        BITBUCKET_USERNAME: "stdio-test-user",
        BITBUCKET_APP_PASSWORD: "stdio-test-pass",
        BITBUCKET_WORKSPACE: workspace,
        BITBUCKET_BASE_URL: baseUrl,
      });

      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [distIndexPath],
        cwd: projectRoot,
        env: childEnv,
        stderr: "pipe",
      });

      const client = new Client({ name: "bitbucket-mcp-stdio-integration", version: "0.0.0" });

      try {
        await client.connect(transport);

        const { tools } = await client.listTools();
        expect(tools.some((t) => t.name === "list_repositories")).toBe(true);
        expect(tools).toHaveLength(23);

        const result = await client.callTool({
          name: "list_repositories",
          arguments: { page: 1 },
        });

        if ("isError" in result && result.isError) {
          let text = "";
          if ("content" in result && Array.isArray(result.content)) {
            const first = result.content[0];
            if (
              first &&
              typeof first === "object" &&
              "type" in first &&
              first.type === "text" &&
              "text" in first
            ) {
              text = String(first.text);
            }
          }
          throw new Error(`tool error: ${text}`);
        }

        if (!("content" in result) || !Array.isArray(result.content)) {
          throw new Error("expected callTool result with content array");
        }
        const textBlock = result.content.find(
          (c): c is { type: "text"; text: string } => c.type === "text",
        );
        if (!textBlock) {
          throw new Error("expected text content block in callTool result");
        }
        const parsed = JSON.parse(textBlock.text);
        expect(parsed).toMatchObject({ total: 0, repositories: [] });
      } finally {
        await client.close().catch(() => {});
        await transport.close().catch(() => {});
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    },
  );
});
