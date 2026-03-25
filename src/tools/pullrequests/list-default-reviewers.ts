import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbDefaultReviewer } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";
import { RepoArg, defaultReviewerPath, shapeDefaultReviewer } from "./common.js";

const listDefaultReviewersSchema = z.object({ repo_slug: RepoArg });

export class ListDefaultReviewersTool extends BitbucketMcpTool<typeof listDefaultReviewersSchema> {
  readonly toolName = "list_default_reviewers" as const;
  readonly description = "List default reviewers for a repository (auto-added to new PRs)";
  readonly schema = listDefaultReviewersSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listDefaultReviewersSchema>) {
    const qs = new URLSearchParams({ pagelen: String(PAGE_SIZE) });
    const data = await client.get<BbPagedResponse<BbDefaultReviewer>>(
      `${defaultReviewerPath(client.workspace, args.repo_slug)}?${qs}`,
    );
    return {
      total: data.size,
      reviewers: data.values.map(shapeDefaultReviewer),
    };
  }
}
