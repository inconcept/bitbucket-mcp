import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, MsgArg, prPath } from "./common.js";

const requestPrChangesSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg, message: MsgArg });

export class RequestPrChangesTool extends BitbucketMcpTool<typeof requestPrChangesSchema> {
  readonly toolName = "request_pr_changes" as const;
  readonly description = "Request changes on a pull request";
  readonly schema = requestPrChangesSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof requestPrChangesSchema>) {
    const result = await client.post<BbPullRequest>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/request-changes`,
      args.message ? { message: args.message } : {},
    );
    return { requested_changes: true, state: result.state };
  }
}
