import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, MsgArg, prPath } from "./common.js";

const mergePullRequestSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  merge_strategy: z.enum(["merge_commit", "squash", "fast_forward"]).default("merge_commit"),
  message: MsgArg,
  close_source_branch: z.boolean().optional(),
});

export class MergePullRequestTool extends BitbucketMcpTool<typeof mergePullRequestSchema> {
  readonly toolName = "merge_pull_request" as const;
  readonly description = "Merge an open pull request";
  readonly schema = mergePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof mergePullRequestSchema>) {
    const body: Record<string, unknown> = { merge_strategy: args.merge_strategy };
    if (args.message) body.message = args.message;
    if (args.close_source_branch !== undefined) body.close_source_branch = args.close_source_branch;

    const result = await client.post<BbPullRequest>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/merge`,
      body,
    );
    return { merged: true, state: result.state };
  }
}
