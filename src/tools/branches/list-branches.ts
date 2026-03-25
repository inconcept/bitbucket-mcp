import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbBranch } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";

const listBranchesSchema = z.object({
  repo_slug: z.string().min(1).describe("Repository slug"),
  page: z.number().int().positive().default(1),
  search: z.string().optional().describe("Filter branches by name"),
});

export class ListBranchesTool extends BitbucketMcpTool<typeof listBranchesSchema> {
  readonly toolName = "list_branches" as const;
  readonly description = "List branches in a repository";
  readonly schema = listBranchesSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listBranchesSchema>) {
    const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
    if (args.search) qs.set("q", `name ~ "${args.search}"`);

    const data = await client.get<BbPagedResponse<BbBranch>>(
      `/repositories/${client.workspace}/${args.repo_slug}/refs/branches?${qs}`,
    );

    return {
      total: data.size,
      has_next: !!data.next,
      branches: data.values.map((b) => ({
        name: b.name,
        commit: b.target?.hash?.slice(0, 8),
        date: b.target?.date,
      })),
    };
  }
}
