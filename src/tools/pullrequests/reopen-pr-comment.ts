import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, CommentIdArg, prCommentPath } from "./common.js";

const reopenPrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  comment_id: CommentIdArg,
});

export class ReopenPrCommentTool extends BitbucketMcpTool<typeof reopenPrCommentSchema> {
  readonly toolName = "reopen_pr_comment" as const;
  readonly description = "Reopen a resolved comment thread on a pull request";
  readonly schema = reopenPrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof reopenPrCommentSchema>) {
    await client.delete(
      `${prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)}/resolve`,
    );
    return { reopened: true, comment_id: args.comment_id };
  }
}
