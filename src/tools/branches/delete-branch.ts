import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";

const deleteBranchSchema = z.object({
  repo_slug: z.string().min(1).describe("Repository slug"),
  branch_name: z.string().min(1).describe("Branch name to delete"),
});

export class DeleteBranchTool extends BitbucketMcpTool<typeof deleteBranchSchema> {
  readonly toolName = "delete_branch" as const;
  readonly description = "Delete a branch in a repository";
  readonly schema = deleteBranchSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof deleteBranchSchema>) {
    const path = `/repositories/${client.workspace}/${args.repo_slug}/refs/branches/${encodeURIComponent(args.branch_name)}`;
    await client.delete(path);
    return { deleted: args.branch_name, repo: args.repo_slug };
  }
}
