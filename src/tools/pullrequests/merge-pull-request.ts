import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, MsgArg, prPath } from "./common.js";

const MERGE_STRATEGIES = [
  "merge_commit",
  "squash",
  "fast_forward",
  "squash_fast_forward",
  "rebase_fast_forward",
  "rebase_merge",
] as const;

const FALLBACK_STRATEGY: (typeof MERGE_STRATEGIES)[number] = "merge_commit";

const mergePullRequestSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  merge_strategy: z.enum(MERGE_STRATEGIES).optional(),
  message: MsgArg,
  close_source_branch: z.boolean().optional(),
});

export class MergePullRequestTool extends BitbucketMcpTool<typeof mergePullRequestSchema> {
  readonly toolName = "merge_pull_request" as const;
  readonly description =
    "Merge an open pull request. When merge_strategy is omitted, the repository's configured default for the PR's destination branch is used (falling back to merge_commit if none is set).";
  readonly schema = mergePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof mergePullRequestSchema>) {
    const base = prPath(client.workspace, args.repo_slug, args.pr_id);

    let strategy: string = args.merge_strategy ?? "";
    if (!strategy) {
      const pr = await client.get<BbPullRequest>(base);
      strategy = pr.destination?.branch?.default_merge_strategy ?? FALLBACK_STRATEGY;
    }

    const body: Record<string, unknown> = { merge_strategy: strategy };
    if (args.message) body.message = args.message;
    if (args.close_source_branch !== undefined) body.close_source_branch = args.close_source_branch;

    const result = await client.post<BbPullRequest>(`${base}/merge`, body);
    return { merged: true, state: result.state, merge_strategy: strategy };
  }
}
