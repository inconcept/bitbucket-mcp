import { z } from "zod";
import type {
  McpServer,
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BitbucketClient } from "../client.js";
import { toolJsonResult } from "./helpers.js";

/**
 * Base for MCP tools: fixed name/description, Zod input schema, async handler,
 * and identical registerTool wiring with JSON text results.
 */
export abstract class BitbucketMcpTool<TSchema extends z.ZodType> {
  abstract readonly toolName: string;
  abstract readonly description: string;
  abstract readonly schema: TSchema;

  abstract execute(client: BitbucketClient, args: z.infer<TSchema>): Promise<unknown>;

  register(server: McpServer, client: BitbucketClient): RegisteredTool {
    return server.registerTool(
      this.toolName,
      { description: this.description, inputSchema: this.schema },
      (async (args, _extra) =>
        toolJsonResult(
          await this.execute(client, args as z.infer<TSchema>),
        )) as ToolCallback<TSchema>,
    );
  }
}
