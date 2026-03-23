import { describe, it, expect, vi } from "vitest";
import { buildTools } from "../src/tools/index.js";
import type { BitbucketClient } from "../src/client.js";
import type { BbPullRequest } from "../src/types.js";

/** Minimal mock client: only fields used by the tools under test. */
function mockClient(overrides: Partial<BitbucketClient> & { workspace?: string }): BitbucketClient {
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

describe("buildTools", () => {
  it("list_repositories maps paged API response", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 1,
      page: 1,
      pagelen: 25,
      next: undefined,
      values: [
        {
          name: "repo-a",
          slug: "repo-a",
          description: "desc",
          language: "ts",
          is_private: true,
          updated_on: "2020-01-01",
          links: { html: { href: "https://bitbucket.org/ws/repo-a" } },
        },
      ],
    });
    const tools = buildTools(mockClient({ get }));
    const out = await tools.list_repositories.handler({ page: 1 });
    expect(get).toHaveBeenCalledWith("/repositories/ws?page=1&pagelen=25");
    expect(out.repositories).toHaveLength(1);
    expect(out.repositories[0]).toMatchObject({
      name: "repo-a",
      slug: "repo-a",
      private: true,
      url: "https://bitbucket.org/ws/repo-a",
    });
    expect(out.has_next).toBe(false);
  });

  it("list_repositories adds search query when search is set", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 0,
      page: 1,
      values: [],
    });
    const tools = buildTools(mockClient({ get }));
    await tools.list_repositories.handler({ page: 1, search: "foo" });
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("q=name+%7E+%22foo%22")
    );
  });

  it("delete_branch calls DELETE and returns summary", async () => {
    const del = vi.fn().mockResolvedValue({});
    const tools = buildTools(mockClient({ delete: del }));
    const out = await tools.delete_branch.handler({ repo_slug: "r1", branch_name: "old" });
    expect(del).toHaveBeenCalledWith("/repositories/ws/r1/refs/branches/old");
    expect(out).toEqual({ deleted: "old", repo: "r1" });
  });

  it("list_branches maps branch refs", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 1,
      page: 1,
      next: undefined,
      values: [{ name: "main", target: { hash: "abc1234567890abcdef", date: "2020-01-01" } }],
    });
    const tools = buildTools(mockClient({ get }));
    const out = await tools.list_branches.handler({ repo_slug: "r", page: 1 });
    expect(out.branches[0]).toEqual({
      name: "main",
      commit: "abc12345",
      date: "2020-01-01",
    });
  });

  it("list_branches includes search query when search is set", async () => {
    const get = vi.fn().mockResolvedValue({ size: 0, page: 1, values: [] });
    const tools = buildTools(mockClient({ get }));
    await tools.list_branches.handler({ repo_slug: "repo", page: 1, search: "feat" });
    expect(get).toHaveBeenCalledWith(expect.stringContaining("q=name+%7E+%22feat%22"));
  });

  it("get_pull_request returns shaped PR", async () => {
    const pr: BbPullRequest = {
      id: 42,
      title: "Fix bug",
      description: "details",
      state: "OPEN",
      author: { display_name: "Dev", uuid: "u1" },
      source: { branch: { name: "feature", target: { hash: "h1" } } },
      destination: { branch: { name: "main", target: { hash: "h2" } } },
      reviewers: [{ display_name: "R1", uuid: "r1" }],
      participants: [{ user: { display_name: "R1", uuid: "r1" }, role: "REVIEWER", approved: true }],
      created_on: "2020-01-01",
      updated_on: "2020-01-02",
      close_source_branch: false,
      links: { html: { href: "https://pr" } },
    };
    const get = vi.fn().mockResolvedValue(pr);
    const tools = buildTools(mockClient({ get }));
    const out = await tools.get_pull_request.handler({ repo_slug: "my-repo", pr_id: 42 });
    expect(get).toHaveBeenCalledWith("/repositories/ws/my-repo/pullrequests/42");
    expect(out).toMatchObject({
      id: 42,
      title: "Fix bug",
      source_branch: "feature",
      destination_branch: "main",
      url: "https://pr",
    });
    expect(out.reviewers).toContain("R1");
  });

  it("list_pull_requests maps paged pull requests", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 1,
      page: 1,
      next: undefined,
      values: [
        {
          id: 1,
          title: "PR1",
          state: "OPEN",
          author: { display_name: "A", uuid: "u" },
          source: { branch: { name: "f", target: { hash: "h" } } },
          destination: { branch: { name: "m", target: { hash: "h2" } } },
          reviewers: [],
          participants: [],
          created_on: "t",
          updated_on: "t",
          close_source_branch: false,
          links: { html: { href: "u" } },
        },
      ],
    });
    const tools = buildTools(mockClient({ get }));
    const out = await tools.list_pull_requests.handler({ repo_slug: "repo", page: 1, state: "OPEN" });
    expect(get).toHaveBeenCalledWith(
      expect.stringContaining("/repositories/ws/repo/pullrequests?")
    );
    expect(out.pull_requests).toHaveLength(1);
    expect(out.pull_requests[0]).toMatchObject({ id: 1, title: "PR1" });
  });
});
