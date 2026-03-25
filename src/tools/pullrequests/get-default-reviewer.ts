import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbDefaultReviewer } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, UsernameArg, defaultReviewerPath, shapeDefaultReviewer } from "./common.js";

const getDefaultReviewerSchema = z.object({ repo_slug: RepoArg, username: UsernameArg });

export class GetDefaultReviewerTool extends BitbucketMcpTool<typeof getDefaultReviewerSchema> {
  readonly toolName = "get_default_reviewer" as const;
  readonly description = "Get a specific default reviewer";
  readonly schema = getDefaultReviewerSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof getDefaultReviewerSchema>) {
    const r = await client.get<BbDefaultReviewer>(
      defaultReviewerPath(client.workspace, args.repo_slug, args.username),
    );
    return shapeDefaultReviewer(r);
  }
}
