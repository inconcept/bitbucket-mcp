import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbComment } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";
import { RepoArg, PrIdArg, prPath, shapeComment } from "./common.js";

const listPrCommentsSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  page: z.number().int().positive().default(1),
});

export class ListPrCommentsTool extends BitbucketMcpTool<typeof listPrCommentsSchema> {
  readonly toolName = "list_pr_comments" as const;
  readonly description = "List all comments on a pull request";
  readonly schema = listPrCommentsSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listPrCommentsSchema>) {
    const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
    const data = await client.get<BbPagedResponse<BbComment>>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/comments?${qs}`,
    );
    return {
      total: data.size,
      page: data.page,
      has_next: !!data.next,
      comments: data.values.map(shapeComment),
    };
  }
}
