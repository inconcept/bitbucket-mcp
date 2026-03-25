import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, prPath } from "./common.js";

const approvePullRequestSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg });

export class ApprovePullRequestTool extends BitbucketMcpTool<typeof approvePullRequestSchema> {
  readonly toolName = "approve_pull_request" as const;
  readonly description = "Approve a pull request";
  readonly schema = approvePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof approvePullRequestSchema>) {
    await client.post(`${prPath(client.workspace, args.repo_slug, args.pr_id)}/approve`);
    return { approved: true, pr_id: args.pr_id };
  }
}
