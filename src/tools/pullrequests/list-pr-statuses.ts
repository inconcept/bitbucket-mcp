import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbCommitStatus } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";
import { RepoArg, PrIdArg, prPath, shapeStatus } from "./common.js";

const listPrStatusesSchema = z.object({
  repo_slug: RepoArg,
  pr_id: PrIdArg,
  page: z.number().int().positive().default(1),
});

export class ListPrStatusesTool extends BitbucketMcpTool<typeof listPrStatusesSchema> {
  readonly toolName = "list_pr_statuses" as const;
  readonly description = "List commit/build statuses for a pull request";
  readonly schema = listPrStatusesSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listPrStatusesSchema>) {
    const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
    const data = await client.get<BbPagedResponse<BbCommitStatus>>(
      `${prPath(client.workspace, args.repo_slug, args.pr_id)}/statuses?${qs}`,
    );
    return {
      total: data.size,
      page: data.page,
      has_next: !!data.next,
      statuses: data.values.map(shapeStatus),
    };
  }
}
