import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { BitbucketClient } from "./client.js";
import { buildTools, type ToolName } from "./tools/index.js";
import type { Config } from "./config.js";

export async function createServer(config: Config) {
  const client = new BitbucketClient(config);
  const tools  = buildTools(client);

  const server = new Server(
    { name: "bitbucket-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // ── List tools ──────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: Object.entries(tools).map(([name, tool]) => ({
      name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.schema, { $refStrategy: "none" }),
    })),
  }));

  // ── Call tool ───────────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name as ToolName;
    const tool = tools[name];

    if (!tool) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }

    try {
      // Validate input with Zod
      const parsed = tool.schema.parse(req.params.arguments ?? {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (tool.handler as (a: any) => Promise<unknown>)(parsed);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: "text", text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

export async function startServer(config: Config) {
  const server    = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[bitbucket-mcp] Server running on stdio");
}
