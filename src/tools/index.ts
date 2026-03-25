import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BitbucketClient } from "../client.js";
import type { BitbucketMcpTool } from "./bitbucket-mcp-tool.js";
import { ListRepositoriesTool } from "./repositories/index.js";
import { DeleteBranchTool, ListBranchesTool } from "./branches/index.js";
import {
  AddDefaultReviewerTool,
  AddPrCommentTool,
  ApprovePullRequestTool,
  CreatePullRequestTool,
  DeclinePullRequestTool,
  DeletePrCommentTool,
  GetDefaultReviewerTool,
  GetDiffTool,
  GetPrCommentTool,
  GetPullRequestTool,
  ListDefaultReviewersTool,
  ListPrCommentsTool,
  ListPrStatusesTool,
  ListPullRequestsTool,
  MergePullRequestTool,
  RemoveDefaultReviewerTool,
  ReopenPrCommentTool,
  RequestPrChangesTool,
  ResolvePrCommentTool,
  UnapprovePullRequestTool,
  UpdatePrCommentTool,
  UpdatePullRequestTool,
} from "./pullrequests/index.js";

/** Tools that remove refs or comments; omitted from the MCP surface unless `allowDestructiveTools` is true. */
export const GATED_DESTRUCTIVE_TOOL_NAMES = ["delete_branch", "delete_pr_comment"] as const;
export type GatedDestructiveToolName = (typeof GATED_DESTRUCTIVE_TOOL_NAMES)[number];

export function isGatedDestructiveTool(name: string): name is GatedDestructiveToolName {
  return (GATED_DESTRUCTIVE_TOOL_NAMES as readonly string[]).includes(name);
}

/** One instance per tool; created here so registration and tests share the same wiring. */
const TOOLS: ReadonlyArray<BitbucketMcpTool<z.ZodType>> = [
  new ListRepositoriesTool(),
  new ListBranchesTool(),
  new DeleteBranchTool(),
  new ListPullRequestsTool(),
  new GetPullRequestTool(),
  new CreatePullRequestTool(),
  new UpdatePullRequestTool(),
  new MergePullRequestTool(),
  new DeclinePullRequestTool(),
  new AddPrCommentTool(),
  new GetDiffTool(),
  new ListPrCommentsTool(),
  new GetPrCommentTool(),
  new UpdatePrCommentTool(),
  new DeletePrCommentTool(),
  new ResolvePrCommentTool(),
  new ReopenPrCommentTool(),
  new ApprovePullRequestTool(),
  new UnapprovePullRequestTool(),
  new RequestPrChangesTool(),
  new ListPrStatusesTool(),
  new ListDefaultReviewersTool(),
  new GetDefaultReviewerTool(),
  new AddDefaultReviewerTool(),
  new RemoveDefaultReviewerTool(),
];

/**
 * Build a map of tool name to `{ handler }` for direct unit tests (calls `execute` with a mock client).
 * Omits gated destructive tools unless `allowDestructiveTools` is true.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- each tool returns a different result shape; tests assert on fields */
export function buildTools(
  client: BitbucketClient,
  options: { allowDestructiveTools?: boolean } = {},
): Record<string, { handler: (args: unknown) => Promise<any> }> {
  const allowDestructive = options.allowDestructiveTools ?? false;
  const out: Record<string, { handler: (args: unknown) => Promise<any> }> = {};
  for (const mcpTool of TOOLS) {
    if (isGatedDestructiveTool(mcpTool.toolName) && !allowDestructive) continue;
    out[mcpTool.toolName] = {
      handler: (args: unknown) => mcpTool.execute(client, args as never),
    };
  }
  return out;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Register every Bitbucket tool on the given MCP server. Gated destructive tools are disabled unless `allowDestructiveTools` is true. */
export function registerAllTools(
  server: McpServer,
  client: BitbucketClient,
  options: { allowDestructiveTools: boolean },
): void {
  for (const mcpTool of TOOLS) {
    if (isGatedDestructiveTool(mcpTool.toolName) && !options.allowDestructiveTools) {
      continue;
    }
    mcpTool.register(server, client);
  }
}
