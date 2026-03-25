import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, MsgArg, prPath } from "./common.js";

const declinePullRequestSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg, message: MsgArg });

export class DeclinePullRequestTool extends BitbucketMcpTool<typeof declinePullRequestSchema> {
  readonly toolName = "decline_pull_request" as const;
  readonly description = "Decline (reject) an open pull request";
  readonly schema = declinePullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof declinePullRequestSchema>) {
    const result = await client.post<BbPullRequest>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/decline`,
      args.message ? { message: args.message } : {},
    );
    return { declined: true, state: result.state };
  }
}
