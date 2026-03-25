import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BitbucketClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";
import type { Config } from "./config.js";

export async function createServer(config: Config) {
  const client = new BitbucketClient(config);
  const server = new McpServer({ name: "bitbucket-mcp", version: "1.0.0" });
  registerAllTools(server, client, { allowDestructiveTools: config.allowDestructiveTools });
  return server;
}

export async function startServer(config: Config) {
  const server = await createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[bitbucket-mcp] Server running on stdio");
}
