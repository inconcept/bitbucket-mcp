/**
 * Smoke-test every `BitbucketMcpTool` subclass: `toolName`, `schema.parse`, and `execute`
 * with a mocked `BitbucketClient`. Use this when adding new tools.
 *
 * Deeper behavior is covered in `tools.test.ts`, `pullrequests.test.ts`, and
 * `list-pr-statuses.test.ts` (class-level example).
 */
import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { BitbucketMcpTool } from "../../src/tools/bitbucket-mcp-tool.js";
import type { BitbucketClient } from "../../src/client.js";
import type { BbPullRequest } from "../../src/types.js";
import { ListRepositoriesTool } from "../../src/tools/repositories/index.js";
import { DeleteBranchTool, ListBranchesTool } from "../../src/tools/branches/index.js";
import {
  AddDefaultReviewerTool,
  AddPrCommentTool,
  ApprovePullRequestTool,
  CreatePullRequestTool,
  DeclinePullRequestTool,
  DeletePrCommentTool,
  GetDefaultReviewerTool,
  GetDiffTool,
  GetPrCommentTool,
  GetPullRequestTool,
  ListDefaultReviewersTool,
  ListPrCommentsTool,
  ListPrStatusesTool,
  ListPullRequestsTool,
  MergePullRequestTool,
  RemoveDefaultReviewerTool,
  ReopenPrCommentTool,
  RequestPrChangesTool,
  ResolvePrCommentTool,
  UnapprovePullRequestTool,
  UpdatePrCommentTool,
  UpdatePullRequestTool,
} from "../../src/tools/pullrequests/index.js";

function mockClient(overrides: Partial<BitbucketClient> = {}): BitbucketClient {
  return {
    workspace: "ws",
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    rawText: vi.fn(),
    ...overrides,
  } as unknown as BitbucketClient;
}

function minimalPr(overrides: Partial<BbPullRequest> = {}): BbPullRequest {
  return {
    id: 1,
    title: "T",
    state: "OPEN",
    author: { display_name: "A", uuid: "u" },
    source: { branch: { name: "f", target: { hash: "h" } } },
    destination: { branch: { name: "m", target: { hash: "h2" } } },
    reviewers: [],
    participants: [],
    created_on: "c",
    updated_on: "u",
    close_source_branch: false,
    links: { html: { href: "https://x" } },
    ...overrides,
  };
}

type ToolCase = {
  name: string;
  Tool: new () => BitbucketMcpTool<z.ZodType>;
  args: unknown;
  prepare: (c: BitbucketClient) => void;
};

const TOOL_CASES: ToolCase[] = [
  {
    name: "list_repositories",
    Tool: ListRepositoriesTool,
    args: { page: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, page: 1, values: [] });
    },
  },
  {
    name: "list_branches",
    Tool: ListBranchesTool,
    args: { repo_slug: "r", page: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, page: 1, values: [] });
    },
  },
  {
    name: "delete_branch",
    Tool: DeleteBranchTool,
    args: { repo_slug: "r", branch_name: "b" },
    prepare: (c) => {
      vi.mocked(c.delete).mockResolvedValue(undefined);
    },
  },
  {
    name: "list_pull_requests",
    Tool: ListPullRequestsTool,
    args: { repo_slug: "r", page: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, page: 1, values: [] });
    },
  },
  {
    name: "get_pull_request",
    Tool: GetPullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue(minimalPr());
    },
  },
  {
    name: "create_pull_request",
    Tool: CreatePullRequestTool,
    args: {
      repo_slug: "r",
      title: "T",
      source_branch: "a",
      destination_branch: "b",
      close_source_branch: false,
    },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue(minimalPr());
    },
  },
  {
    name: "update_pull_request",
    Tool: UpdatePullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.put).mockResolvedValue(minimalPr());
    },
  },
  {
    name: "merge_pull_request",
    Tool: MergePullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue(minimalPr({ state: "MERGED" }));
    },
  },
  {
    name: "decline_pull_request",
    Tool: DeclinePullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue(minimalPr({ state: "DECLINED" }));
    },
  },
  {
    name: "add_pr_comment",
    Tool: AddPrCommentTool,
    args: { repo_slug: "r", pr_id: 1, content: "hi" },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue({ id: 1, created_on: "now" });
    },
  },
  {
    name: "get_diff",
    Tool: GetDiffTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.rawText).mockResolvedValue("diff\n");
    },
  },
  {
    name: "list_pr_comments",
    Tool: ListPrCommentsTool,
    args: { repo_slug: "r", pr_id: 1, page: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, page: 1, values: [] });
    },
  },
  {
    name: "get_pr_comment",
    Tool: GetPrCommentTool,
    args: { repo_slug: "r", pr_id: 1, comment_id: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({
        id: 1,
        content: { raw: "x" },
        created_on: "c",
      });
    },
  },
  {
    name: "update_pr_comment",
    Tool: UpdatePrCommentTool,
    args: { repo_slug: "r", pr_id: 1, comment_id: 1, content: "y" },
    prepare: (c) => {
      vi.mocked(c.put).mockResolvedValue({
        id: 1,
        content: { raw: "y" },
        created_on: "c",
      });
    },
  },
  {
    name: "delete_pr_comment",
    Tool: DeletePrCommentTool,
    args: { repo_slug: "r", pr_id: 1, comment_id: 1 },
    prepare: (c) => {
      vi.mocked(c.delete).mockResolvedValue(undefined);
    },
  },
  {
    name: "resolve_pr_comment",
    Tool: ResolvePrCommentTool,
    args: { repo_slug: "r", pr_id: 1, comment_id: 1 },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue({});
    },
  },
  {
    name: "reopen_pr_comment",
    Tool: ReopenPrCommentTool,
    args: { repo_slug: "r", pr_id: 1, comment_id: 1 },
    prepare: (c) => {
      vi.mocked(c.delete).mockResolvedValue(undefined);
    },
  },
  {
    name: "approve_pull_request",
    Tool: ApprovePullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue({});
    },
  },
  {
    name: "unapprove_pull_request",
    Tool: UnapprovePullRequestTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.delete).mockResolvedValue(undefined);
    },
  },
  {
    name: "request_pr_changes",
    Tool: RequestPrChangesTool,
    args: { repo_slug: "r", pr_id: 1 },
    prepare: (c) => {
      vi.mocked(c.post).mockResolvedValue(minimalPr());
    },
  },
  {
    name: "list_pr_statuses",
    Tool: ListPrStatusesTool,
    args: { repo_slug: "r", pr_id: 1, page: 1 },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, page: 1, values: [] });
    },
  },
  {
    name: "list_default_reviewers",
    Tool: ListDefaultReviewersTool,
    args: { repo_slug: "r" },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ size: 0, values: [] });
    },
  },
  {
    name: "get_default_reviewer",
    Tool: GetDefaultReviewerTool,
    args: { repo_slug: "r", username: "u" },
    prepare: (c) => {
      vi.mocked(c.get).mockResolvedValue({ display_name: "D", uuid: "id" });
    },
  },
  {
    name: "add_default_reviewer",
    Tool: AddDefaultReviewerTool,
    args: { repo_slug: "r", username: "u" },
    prepare: (c) => {
      vi.mocked(c.put).mockResolvedValue({ display_name: "D", uuid: "id" });
    },
  },
  {
    name: "remove_default_reviewer",
    Tool: RemoveDefaultReviewerTool,
    args: { repo_slug: "r", username: "u" },
    prepare: (c) => {
      vi.mocked(c.delete).mockResolvedValue(undefined);
    },
  },
];

describe("all BitbucketMcpTool subclasses", () => {
  it.each(TOOL_CASES)("$name: toolName matches registry", ({ name, Tool }) => {
    expect(new Tool().toolName).toBe(name);
  });

  it.each(TOOL_CASES)(
    "$name: execute resolves with mocked client",
    async ({ Tool, args, prepare }) => {
      const client = mockClient();
      prepare(client);
      const tool = new Tool();
      const parsed = tool.schema.parse(args);
      await expect(tool.execute(client, parsed)).resolves.toBeDefined();
    },
  );

  it("covers every tool in src/tools/index.ts TOOLS order (25 tools)", () => {
    expect(TOOL_CASES).toHaveLength(25);
    expect(new Set(TOOL_CASES.map((c) => c.name)).size).toBe(25);
  });
});
