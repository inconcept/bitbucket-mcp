import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { DIFF_MAX_LEN } from "../constants.js";
import { RepoArg, PrIdArg, prPath } from "./common.js";

const getDiffSchema = z.object({ repo_slug: RepoArg, pr_id: PrIdArg });

export class GetDiffTool extends BitbucketMcpTool<typeof getDiffSchema> {
  readonly toolName = "get_diff" as const;
  readonly description = "Get the unified diff for a pull request (truncated to 8 KB)";
  readonly schema = getDiffSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof getDiffSchema>) {
    const diff = await client.rawText(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/diff`,
    );
    const truncated = diff.length > DIFF_MAX_LEN;
    return {
      diff: truncated ? diff.slice(0, DIFF_MAX_LEN) : diff,
      truncated,
      size: diff.length,
    };
  }
}
