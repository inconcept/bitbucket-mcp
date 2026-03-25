import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, prPath } from "./common.js";

const unapprovePullRequestSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg });

export class UnapprovePullRequestTool extends BitbucketMcpTool<typeof unapprovePullRequestSchema> {
  readonly toolName = "unapprove_pull_request" as const;
  readonly description = "Remove your approval from a pull request";
  readonly schema = unapprovePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof unapprovePullRequestSchema>) {
    await client.delete(`${prPath(client.workspace, args.repo_slug, args.pr_id)}/approve`);
    return { unapproved: true, pr_id: args.pr_id };
  }
}
