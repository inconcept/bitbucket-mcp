import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPagedResponse, BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { PAGE_SIZE } from "../constants.js";
import { RepoArg, shapePr } from "./common.js";

const listPullRequestsSchema = z.object({
  repo_slug: RepoArg,
  state: z.enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"]).default("OPEN"),
  page: z.number().int().positive().default(1),
});

export class ListPullRequestsTool extends BitbucketMcpTool<typeof listPullRequestsSchema> {
  readonly toolName = "list_pull_requests" as const;
  readonly description = "List pull requests for a repository";
  readonly schema = listPullRequestsSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof listPullRequestsSchema>) {
    const qs = new URLSearchParams({
      state: args.state,
      page: String(args.page),
      pagelen: String(PAGE_SIZE),
    });
    const data = await client.get<BbPagedResponse<BbPullRequest>>(
      `/repositories/${client.workspace}/${args.repo_slug}/pullrequests?${qs}`,
    );
    return {
      total: data.size,
      page: data.page,
      has_next: !!data.next,
      pull_requests: data.values.map(shapePr),
    };
  }
}
