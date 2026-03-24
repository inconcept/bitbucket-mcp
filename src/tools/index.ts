import type { BitbucketClient } from "../client.js";
import { repositoryTools } from "./repositories.js";
import { pullRequestTools } from "./pullrequests.js";
import { branchTools } from "./branches.js";

/** Tools that remove refs or comments; omitted from the MCP surface unless `allowDestructiveTools` is true. */
export const GATED_DESTRUCTIVE_TOOL_NAMES = ["delete_branch", "delete_pr_comment"] as const;
export type GatedDestructiveToolName = (typeof GATED_DESTRUCTIVE_TOOL_NAMES)[number];

export function isGatedDestructiveTool(name: string): name is GatedDestructiveToolName {
  return (GATED_DESTRUCTIVE_TOOL_NAMES as readonly string[]).includes(name);
}

/** Full tool map (all handlers). */
export function buildAllTools(client: BitbucketClient) {
  return {
    ...repositoryTools(client),
    ...pullRequestTools(client),
    ...branchTools(client),
  };
}

export type ToolMap = ReturnType<typeof buildAllTools>;
export type ToolName = keyof ToolMap;

export type ToolMapWithoutDestructive = Omit<ToolMap, GatedDestructiveToolName>;

/** Full tool map including `delete_branch` and `delete_pr_comment`. */
export function buildTools(
  client: BitbucketClient,
  options: { allowDestructiveTools: true },
): ToolMap;
/** Omits destructive delete tools by default (when omitted or false). */
export function buildTools(
  client: BitbucketClient,
  options?: { allowDestructiveTools?: false },
): ToolMapWithoutDestructive;
export function buildTools(
  client: BitbucketClient,
  options?: { allowDestructiveTools?: boolean },
): ToolMap | ToolMapWithoutDestructive {
  const all = buildAllTools(client);
  if (options?.allowDestructiveTools ?? false) return all;
  const rest = { ...all };
  for (const name of GATED_DESTRUCTIVE_TOOL_NAMES) {
    delete (rest as Record<string, unknown>)[name];
  }
  return rest;
}
