import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbRepository } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";

const listRepositoriesSchema = z.object({
  page: z.number().int().positive().default(1).describe("Page number"),
  search: z.string().optional().describe("Filter repos by name (partial match)"),
});

export class ListRepositoriesTool extends BitbucketMcpTool<typeof listRepositoriesSchema> {
  readonly toolName = "list_repositories" as const;
  readonly description = "List all repositories in the configured workspace";
  readonly schema = listRepositoriesSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listRepositoriesSchema>) {
    const { page, search } = args;
    const qs = new URLSearchParams({ page: String(page), pagelen: String(PAGE_SIZE) });
    if (search) qs.set("q", `name ~ "${search}"`);

    const data = await client.get<BbPagedResponse<BbRepository>>(
      `/repositories/${client.workspace}?${qs}`,
    );

    return {
      total: data.size,
      page: data.page,
      has_next: !!data.next,
      repositories: data.values.map((r) => ({
        name: r.name,
        slug: r.slug,
        description: r.description || "",
        language: r.language || "",
        private: r.is_private,
        updated_on: r.updated_on,
        url: r.links?.html?.href,
      })),
    };
  }
}
