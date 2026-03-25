import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, CommentIdArg, prCommentPath } from "./common.js";

const resolvePrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  comment_id: CommentIdArg,
});

export class ResolvePrCommentTool extends BitbucketMcpTool<typeof resolvePrCommentSchema> {
  readonly toolName = "resolve_pr_comment" as const;
  readonly description = "Resolve a comment thread on a pull request";
  readonly schema = resolvePrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof resolvePrCommentSchema>) {
    await client.post(
      `${prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)}/resolve`,
    );
    return { resolved: true, comment_id: args.comment_id };
  }
}
