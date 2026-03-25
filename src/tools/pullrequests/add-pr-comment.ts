import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbComment } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, PrIdArg, prPath } from "./common.js";

const addPrCommentSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  content: z.string().min(1),
});

export class AddPrCommentTool extends BitbucketMcpTool<typeof addPrCommentSchema> {
  readonly toolName = "add_pr_comment" as const;
  readonly description = "Post a Markdown comment on a pull request";
  readonly schema = addPrCommentSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof addPrCommentSchema>) {
    const result = await client.post<BbComment>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/comments`,
      { content: { raw: args.content } },
    );
    return { id: result.id, created_on: result.created_on };
  }
}
