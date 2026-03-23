import { describe, it, expect, vi } from "vitest";
import { buildTools } from "../src/tools/index.js";
import type { BitbucketClient } from "../src/client.js";
import type { BbPullRequest } from "../src/types.js";

const DIFF_MAX_LEN = 8192;

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

/** Minimal PR returned from POST/PUT/GET where shapePr is applied. */
function prFixture(overrides: Partial<BbPullRequest> = {}): BbPullRequest {
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

describe("pullRequest tools", () => {
  it("create_pull_request posts body with uuid vs username reviewers", async () => {
    const post = vi.fn().mockResolvedValue(prFixture({ id: 99 }));
    const tools = buildTools(mockClient({ post }));
    await tools.create_pull_request.handler({
      repo_slug: "r",
      title: "Hi",
      source_branch: "a",
      destination_branch: "b",
      close_source_branch: false,
      reviewers: ["{uuid-123}", "plain"],
    });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests", {
      title: "Hi",
      description: "",
      source: { branch: { name: "a" } },
      destination: { branch: { name: "b" } },
      close_source_branch: false,
      reviewers: [{ uuid: "{uuid-123}" }, { username: "plain" }],
    });
  });

  it("create_pull_request maps uuid-only and username-only reviewer arrays", async () => {
    const post = vi.fn().mockResolvedValue(prFixture());
    const tools = buildTools(mockClient({ post }));
    await tools.create_pull_request.handler({
      repo_slug: "r",
      title: "T",
      source_branch: "a",
      destination_branch: "b",
      close_source_branch: false,
      reviewers: ["{u1}"],
    });
    expect(post).toHaveBeenLastCalledWith(
      "/repositories/ws/r/pullrequests",
      expect.objectContaining({
        reviewers: [{ uuid: "{u1}" }],
      })
    );
    await tools.create_pull_request.handler({
      repo_slug: "r",
      title: "T2",
      source_branch: "a",
      destination_branch: "b",
      close_source_branch: false,
      reviewers: ["alice"],
    });
    expect(post).toHaveBeenLastCalledWith(
      "/repositories/ws/r/pullrequests",
      expect.objectContaining({
        reviewers: [{ username: "alice" }],
      })
    );
  });

  it("update_pull_request sends only provided fields", async () => {
    const put = vi.fn().mockResolvedValue(prFixture({ title: "New" }));
    const tools = buildTools(mockClient({ put }));
    await tools.update_pull_request.handler({
      repo_slug: "r",
      pr_id: 3,
      title: "New",
      description: "D",
      reviewers: ["u1"],
    });
    expect(put).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/3", {
      title: "New",
      description: "D",
      reviewers: [{ username: "u1" }],
    });
  });

  it("update_pull_request can send only description (no title)", async () => {
    const put = vi.fn().mockResolvedValue(prFixture());
    const tools = buildTools(mockClient({ put }));
    await tools.update_pull_request.handler({
      repo_slug: "r",
      pr_id: 4,
      description: "only desc",
    });
    expect(put).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/4", { description: "only desc" });
  });

  it("update_pull_request can send only title", async () => {
    const put = vi.fn().mockResolvedValue(prFixture());
    const tools = buildTools(mockClient({ put }));
    await tools.update_pull_request.handler({
      repo_slug: "r",
      pr_id: 5,
      title: "only title",
    });
    expect(put).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/5", { title: "only title" });
  });

  it("merge_pull_request posts merge body with optional fields", async () => {
    const post = vi.fn().mockResolvedValue(prFixture({ state: "MERGED" }));
    const tools = buildTools(mockClient({ post }));
    const out = await tools.merge_pull_request.handler({
      repo_slug: "r",
      pr_id: 1,
      merge_strategy: "squash",
      message: "merge msg",
      close_source_branch: true,
    });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/merge", {
      merge_strategy: "squash",
      message: "merge msg",
      close_source_branch: true,
    });
    expect(out).toEqual({ merged: true, state: "MERGED" });
  });

  it("merge_pull_request sends only merge_strategy when no message or close_source_branch", async () => {
    const post = vi.fn().mockResolvedValue(prFixture({ state: "MERGED" }));
    const tools = buildTools(mockClient({ post }));
    await tools.merge_pull_request.handler({
      repo_slug: "r",
      pr_id: 2,
      merge_strategy: "fast_forward",
    });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/2/merge", {
      merge_strategy: "fast_forward",
    });
  });

  it("decline_pull_request posts message or empty object", async () => {
    const post = vi.fn().mockResolvedValue(prFixture({ state: "DECLINED" }));
    const tools = buildTools(mockClient({ post }));
    await tools.decline_pull_request.handler({ repo_slug: "r", pr_id: 2, message: "no" });
    expect(post).toHaveBeenLastCalledWith("/repositories/ws/r/pullrequests/2/decline", { message: "no" });
    await tools.decline_pull_request.handler({ repo_slug: "r", pr_id: 2 });
    expect(post).toHaveBeenLastCalledWith("/repositories/ws/r/pullrequests/2/decline", {});
  });

  it("add_pr_comment posts raw content", async () => {
    const post = vi.fn().mockResolvedValue({ id: 5, created_on: "now" });
    const tools = buildTools(mockClient({ post }));
    const out = await tools.add_pr_comment.handler({ repo_slug: "r", pr_id: 1, content: "hi" });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments", {
      content: { raw: "hi" },
    });
    expect(out).toEqual({ id: 5, created_on: "now" });
  });

  it("get_diff returns full or truncated diff", async () => {
    const short = "diff --git a\n";
    const rawText = vi.fn().mockResolvedValueOnce(short).mockResolvedValueOnce("x".repeat(DIFF_MAX_LEN + 100));
    const t1 = buildTools(mockClient({ rawText }));
    await expect(t1.get_diff.handler({ repo_slug: "r", pr_id: 1 })).resolves.toEqual({
      diff: short,
      truncated: false,
      size: short.length,
    });
    const outLong = await t1.get_diff.handler({ repo_slug: "r", pr_id: 1 });
    expect(outLong.truncated).toBe(true);
    expect(outLong.diff.length).toBe(DIFF_MAX_LEN);
    expect(outLong.size).toBe(DIFF_MAX_LEN + 100);
  });

  it("list_pr_comments maps comments with shapeComment branches", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 2,
      page: 1,
      next: "next",
      values: [
        {
          id: 1,
          content: { raw: "a" },
          user: { display_name: "U" },
          created_on: "c",
          deleted: true,
          inline: { path: "p", from: 1, to: 2 },
        },
        {
          id: 2,
          content: {},
          created_on: "c",
        },
      ],
    });
    const tools = buildTools(mockClient({ get }));
    const out = await tools.list_pr_comments.handler({ repo_slug: "r", pr_id: 1, page: 1 });
    expect(out.has_next).toBe(true);
    expect(out.comments[0]).toMatchObject({
      id: 1,
      content: "a",
      author: "U",
      deleted: true,
      inline: { path: "p", from: 1, to: 2 },
    });
    expect(out.comments[1].content).toBe("");
  });

  it("get_pr_comment and update_pr_comment", async () => {
    const get = vi.fn().mockResolvedValue({
      id: 9,
      content: { raw: "x" },
      user: { display_name: "A" },
      created_on: "c",
    });
    const put = vi.fn().mockResolvedValue({
      id: 9,
      content: { raw: "y" },
      user: { display_name: "A" },
      created_on: "c",
    });
    const tools = buildTools(mockClient({ get, put }));
    const g = await tools.get_pr_comment.handler({ repo_slug: "r", pr_id: 1, comment_id: 9 });
    expect(get).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments/9");
    expect(g.id).toBe(9);
    const u = await tools.update_pr_comment.handler({
      repo_slug: "r",
      pr_id: 1,
      comment_id: 9,
      content: "y",
    });
    expect(put).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments/9", {
      content: { raw: "y" },
    });
    expect(u.content).toBe("y");
  });

  it("delete_pr_comment, resolve_pr_comment, reopen_pr_comment", async () => {
    const del = vi.fn().mockResolvedValue({});
    const post = vi.fn().mockResolvedValue({});
    const tools = buildTools(mockClient({ delete: del, post }));
    expect(await tools.delete_pr_comment.handler({ repo_slug: "r", pr_id: 1, comment_id: 2 })).toEqual({
      deleted: true,
      comment_id: 2,
    });
    expect(del).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments/2");
    expect(
      await tools.resolve_pr_comment.handler({ repo_slug: "r", pr_id: 1, comment_id: 3 })
    ).toEqual({ resolved: true, comment_id: 3 });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments/3/resolve");
    expect(
      await tools.reopen_pr_comment.handler({ repo_slug: "r", pr_id: 1, comment_id: 4 })
    ).toEqual({ reopened: true, comment_id: 4 });
    expect(del).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/comments/4/resolve");
  });

  it("approve_pull_request and unapprove_pull_request", async () => {
    const post = vi.fn().mockResolvedValue({});
    const del = vi.fn().mockResolvedValue({});
    const tools = buildTools(mockClient({ post, delete: del }));
    expect(await tools.approve_pull_request.handler({ repo_slug: "r", pr_id: 7 })).toEqual({
      approved: true,
      pr_id: 7,
    });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/7/approve");
    expect(await tools.unapprove_pull_request.handler({ repo_slug: "r", pr_id: 7 })).toEqual({
      unapproved: true,
      pr_id: 7,
    });
    expect(del).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/7/approve");
  });

  it("request_pr_changes", async () => {
    const post = vi.fn().mockResolvedValue(prFixture({ state: "OPEN" }));
    const tools = buildTools(mockClient({ post }));
    await tools.request_pr_changes.handler({ repo_slug: "r", pr_id: 1, message: "fix" });
    expect(post).toHaveBeenCalledWith("/repositories/ws/r/pullrequests/1/request-changes", {
      message: "fix",
    });
    await tools.request_pr_changes.handler({ repo_slug: "r", pr_id: 1 });
    expect(post).toHaveBeenLastCalledWith("/repositories/ws/r/pullrequests/1/request-changes", {});
  });

  it("list_pr_statuses maps statuses", async () => {
    const get = vi.fn().mockResolvedValue({
      size: 1,
      page: 1,
      values: [
        {
          uuid: "u",
          key: "k",
          name: "n",
          state: "SUCCESSFUL",
          url: "https://ci",
          created_on: "a",
          updated_on: "b",
        },
      ],
    });
    const tools = buildTools(mockClient({ get }));
    const out = await tools.list_pr_statuses.handler({ repo_slug: "r", pr_id: 1, page: 1 });
    expect(out.statuses[0]).toMatchObject({ uuid: "u", key: "k", state: "SUCCESSFUL" });
  });

  it("list_default_reviewers and get_default_reviewer", async () => {
    const get = vi.fn().mockResolvedValueOnce({
      size: 1,
      values: [{ display_name: "D", uuid: "id", nickname: "n" }],
    }).mockResolvedValueOnce({
      display_name: "D",
      uuid: "id",
      nickname: "n",
    });
    const tools = buildTools(mockClient({ get }));
    const list = await tools.list_default_reviewers.handler({ repo_slug: "repo" });
    expect(list.reviewers[0]).toEqual({ display_name: "D", uuid: "id", nickname: "n" });
    const one = await tools.get_default_reviewer.handler({ repo_slug: "repo", username: "u%40x" });
    expect(get).toHaveBeenLastCalledWith(
      "/repositories/ws/repo/default-reviewers/u%2540x"
    );
    expect(one.display_name).toBe("D");
  });

  it("add_default_reviewer uses shape when API returns reviewer or username fallback", async () => {
    const put = vi
      .fn()
      .mockResolvedValueOnce({ display_name: "X", uuid: "1" })
      .mockResolvedValueOnce({});
    const tools = buildTools(mockClient({ put }));
    const a = await tools.add_default_reviewer.handler({ repo_slug: "r", username: "bob" });
    expect(a.added).toBe(true);
    expect(a.reviewer).toMatchObject({ display_name: "X" });
    const b = await tools.add_default_reviewer.handler({ repo_slug: "r", username: "ann" });
    expect(b.reviewer).toEqual({ username: "ann" });
  });

  it("remove_default_reviewer", async () => {
    const del = vi.fn().mockResolvedValue({});
    const tools = buildTools(mockClient({ delete: del }));
    const out = await tools.remove_default_reviewer.handler({ repo_slug: "r", username: "u" });
    expect(del).toHaveBeenCalledWith("/repositories/ws/r/default-reviewers/u");
    expect(out).toEqual({ removed: true, username: "u" });
  });

  it("get_pull_request covers shapePr when reviewers and participants are absent", async () => {
    const pr = {
      ...prFixture(),
      reviewers: undefined,
      participants: undefined,
    } as unknown as BbPullRequest;
    const get = vi.fn().mockResolvedValue(pr);
    const tools = buildTools(mockClient({ get }));
    const out = await tools.get_pull_request.handler({ repo_slug: "r", pr_id: 1 });
    expect(out.reviewers).toEqual([]);
    expect(out.participants).toEqual([]);
  });
});
