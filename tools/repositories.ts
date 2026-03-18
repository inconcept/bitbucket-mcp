import { z } from "zod";
import type { BitbucketClient } from "../client.js";
import type { BbPagedResponse, BbRepository } from "../types.js";

const PAGE_SIZE = 25;

export const repositoryTools = (client: BitbucketClient) => ({
  list_repositories: {
    description: "List all repositories in the configured workspace",
    schema: z.object({
      page:   z.number().int().positive().default(1).describe("Page number"),
      search: z.string().optional().describe("Filter repos by name (partial match)"),
    }),
    async handler({ page, search }: { page: number; search?: string }) {
      const qs = new URLSearchParams({ page: String(page), pagelen: String(PAGE_SIZE) });
      if (search) qs.set("q", `name ~ "${search}"`);

      const data = await client.get<BbPagedResponse<BbRepository>>(
        `/repositories/${client.workspace}?${qs}`
      );

      return {
        total: data.size,
        page: data.page,
        has_next: !!data.next,
        repositories: data.values.map((r) => ({
          name:       r.name,
          slug:       r.slug,
          description:r.description || "",
          language:   r.language || "",
          private:    r.is_private,
          updated_on: r.updated_on,
          url:        r.links?.html?.href,
        })),
      };
    },
  },
});
