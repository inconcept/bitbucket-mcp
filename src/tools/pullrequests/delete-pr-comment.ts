import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, CommentIdArg, prCommentPath } from "./common.js";

const deletePrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  comment_id: CommentIdArg,
});

export class DeletePrCommentTool extends BitbucketMcpTool<typeof deletePrCommentSchema> {
  readonly toolName = "delete_pr_comment" as const;
  readonly description = "Delete a comment on a pull request";
  readonly schema = deletePrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof deletePrCommentSchema>) {
    await client.delete(
      prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id),
    );
    return { deleted: true, comment_id: args.comment_id };
  }
}
