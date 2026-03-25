import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbComment } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, CommentIdArg, prCommentPath, shapeComment } from "./common.js";

const getPrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  comment_id: CommentIdArg,
});

export class GetPrCommentTool extends BitbucketMcpTool<typeof getPrCommentSchema> {
  readonly toolName = "get_pr_comment" as const;
  readonly description = "Get a specific comment on a pull request";
  readonly schema = getPrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof getPrCommentSchema>) {
    const c = await client.get<BbComment>(
      prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id),
    );
    return shapeComment(c);
  }
}
