import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, prPath, shapePr } from "./common.js";

const updatePullRequestSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  title: z.string().optional(),
  description: z.string().optional(),
  reviewers: z.array(z.string()).optional(),
});

export class UpdatePullRequestTool extends BitbucketMcpTool<typeof updatePullRequestSchema> {
  readonly toolName = "update_pull_request" as const;
  readonly description = "Update the title, description, or reviewers of a pull request";
  readonly schema = updatePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof updatePullRequestSchema>) {
    const body: Record<string, unknown> = {};
    if (args.title) body.title = args.title;
    if (args.description !== undefined) body.description = args.description;
    if (args.reviewers) body.reviewers = args.reviewers.map((r) => ({ username: r }));

    const pr = await client.put<BbPullRequest>(
      prPath(client.workspace, args.repo_slug, args.pr_id),
      body,
    );
    return shapePr(pr);
  }
}
