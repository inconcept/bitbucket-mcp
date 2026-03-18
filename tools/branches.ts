import { z } from "zod";
import type { BitbucketClient } from "../client.js";
import type { BbPagedResponse, BbBranch } from "../types.js";

const PAGE_SIZE = 25;

export const branchTools = (client: BitbucketClient) => ({
  delete_branch: {
    description: "Delete a branch in a repository",
    schema: z.object({
      repo_slug:   z.string().min(1).describe("Repository slug"),
      branch_name: z.string().min(1).describe("Branch name to delete"),
    }),
    async handler(args: { repo_slug: string; branch_name: string }) {
      const path = `/repositories/${client.workspace}/${args.repo_slug}/refs/branches/${encodeURIComponent(args.branch_name)}`;
      await client.delete(path);
      return { deleted: args.branch_name, repo: args.repo_slug };
    },
  },
  list_branches: {
    description: "List branches in a repository",
    schema: z.object({
      repo_slug: z.string().min(1).describe("Repository slug"),
      page:      z.number().int().positive().default(1),
      search:    z.string().optional().describe("Filter branches by name"),
    }),
    async handler(args: { repo_slug: string; page: number; search?: string }) {
      const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
      if (args.search) qs.set("q", `name ~ "${args.search}"`);

      const data = await client.get<BbPagedResponse<BbBranch>>(
        `/repositories/${client.workspace}/${args.repo_slug}/refs/branches?${qs}`
      );

      return {
        total:    data.size,
        has_next: !!data.next,
        branches: data.values.map((b) => ({
          name:   b.name,
          commit: b.target?.hash?.slice(0, 8),
          date:   b.target?.date,
        })),
      };
    },
  },
});
