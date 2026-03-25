import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, prPath, shapePr } from "./common.js";

const getPullRequestSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg });

export class GetPullRequestTool extends BitbucketMcpTool<typeof getPullRequestSchema> {
  readonly toolName = "get_pull_request" as const;
  readonly description = "Get full details of a specific pull request";
  readonly schema = getPullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof getPullRequestSchema>) {
    const pr = await client.get<BbPullRequest>(
      prPath(client.workspace, args.repo_slug, args.pr_id),
    );
    return shapePr(pr);
  }
}
