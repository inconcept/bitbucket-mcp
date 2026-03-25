import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbDefaultReviewer } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, UsernameArg, defaultReviewerPath, shapeDefaultReviewer } from "./common.js";

const addDefaultReviewerSchema = z.object({ repo_slug: RepoArg, username: UsernameArg });

export class AddDefaultReviewerTool extends BitbucketMcpTool<typeof addDefaultReviewerSchema> {
  readonly toolName = "add_default_reviewer" as const;
  readonly description = "Add a user as default reviewer for the repository";
  readonly schema = addDefaultReviewerSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof addDefaultReviewerSchema>) {
    const r = await client.put<BbDefaultReviewer | Record<string, never>>(
      defaultReviewerPath(client.workspace, args.repo_slug, args.username),
    );
    const reviewer =
      r && "display_name" in r
        ? shapeDefaultReviewer(r as BbDefaultReviewer)
        : { username: args.username };
    return { added: true, reviewer };
  }
}
