import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import type { BbPullRequest } from "../../types.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";
import { RepoArg, shapePr } from "./common.js";

const createPullRequestSchema = z.object({
  repo_slug: RepoArg,
  title: z.string().min(1),
  description: z.string().optional(),
  source_branch: z.string().min(1).describe("Branch to merge from"),
  destination_branch: z.string().min(1).describe("Branch to merge into"),
  close_source_branch: z.boolean().default(false).describe("Delete source branch after merge"),
  reviewers: z.array(z.string()).optional().describe("Reviewer usernames or UUIDs"),
});

export class CreatePullRequestTool extends BitbucketMcpTool<typeof createPullRequestSchema> {
  readonly toolName = "create_pull_request" as const;
  readonly description = "Create a new pull request";
  readonly schema = createPullRequestSchema;

  async execute(client: BitbucketClient, args: z.infer<typeof createPullRequestSchema>) {
    const pr = await client.post<BbPullRequest>(
      `/repositories/${client.workspace}/${args.repo_slug}/pullrequests`,
      {
        title: args.title,
        description: args.description ?? "",
        source: { branch: { name: args.source_branch } },
        destination: { branch: { name: args.destination_branch } },
        close_source_branch: args.close_source_branch,
        reviewers: (args.reviewers ?? []).map((r) =>
          r.startsWith("{") ? { uuid: r } : { username: r },
        ),
      },
    );
    return shapePr(pr);
  }
}
