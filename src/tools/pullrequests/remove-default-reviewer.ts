import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, UsernameArg, defaultReviewerPath } from "./common.js";

const removeDefaultReviewerSchema = z.object({ repo_slug: RepoArg, username: UsernameArg });

export class RemoveDefaultReviewerTool extends BitbucketMcpTool<
  typeof removeDefaultReviewerSchema
> {
  readonly toolName = "remove_default_reviewer" as const;
  readonly description = "Remove a user from default reviewers";
  readonly schema = removeDefaultReviewerSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof removeDefaultReviewerSchema>) {
    await client.delete(defaultReviewerPath(client.workspace, args.repo_slug, args.username));
    return { removed: true, username: args.username };
  }
}
