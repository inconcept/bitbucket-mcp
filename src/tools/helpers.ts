import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/** Wrap a JSON-serializable value as MCP tool text content (same shape as the legacy Server handler). */
export function toolJsonResult(data: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  } satisfies CallToolResult;
}
