import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbComment } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, CommentIdArg, prCommentPath, shapeComment } from "./common.js";

const updatePrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  comment_id: CommentIdArg,
  content: z.string().min(1).describe("New comment content (Markdown)"),
});

export class UpdatePrCommentTool extends BitbucketMcpTool<typeof updatePrCommentSchema> {
  readonly toolName = "update_pr_comment" as const;
  readonly description = "Update a comment on a pull request";
  readonly schema = updatePrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof updatePrCommentSchema>) {
    const c = await client.put<BbComment>(
      prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id),
      { content: { raw: args.content } },
    );
    return shapeComment(c);
  }
}
