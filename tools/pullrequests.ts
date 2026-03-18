import { z } from "zod";
import type { BitbucketClient } from "../client.js";
import type { BbPagedResponse, BbPullRequest, BbComment, BbDefaultReviewer, BbCommitStatus } from "../types.js";

const PAGE_SIZE    = 25;
const DIFF_MAX_LEN = 8192;

const RepoArg      = z.string().min(1).describe("Repository slug");
const PrIdArg      = z.number().int().positive().describe("Pull request ID");
const MsgArg       = z.string().optional().describe("Optional message");
const CommentIdArg = z.number().int().positive().describe("Comment ID");
const UsernameArg  = z.string().min(1).describe("Bitbucket username");

function prPath(workspace: string, repo: string, prId: number): string {
  return `/repositories/${workspace}/${repo}/pullrequests/${prId}`;
}

function prCommentPath(workspace: string, repo: string, prId: number, commentId: number): string {
  return `${prPath(workspace, repo, prId)}/comments/${commentId}`;
}

function defaultReviewerPath(workspace: string, repo: string, username?: string): string {
  const base = `/repositories/${workspace}/${repo}/default-reviewers`;
  return username ? `${base}/${encodeURIComponent(username)}` : base;
}

function shapePr(pr: BbPullRequest) {
  return {
    id:                  pr.id,
    title:               pr.title,
    description:         pr.description ?? "",
    state:               pr.state,
    author:              pr.author?.display_name,
    source_branch:       pr.source?.branch?.name,
    destination_branch:  pr.destination?.branch?.name,
    reviewers:           pr.reviewers?.map((r) => r.display_name) ?? [],
    participants:        pr.participants?.map((p) => ({
      name:     p.user?.display_name,
      role:     p.role,
      approved: p.approved,
    })) ?? [],
    created_on:          pr.created_on,
    updated_on:          pr.updated_on,
    url:                 pr.links?.html?.href,
  };
}

function shapeComment(c: BbComment) {
  return {
    id:         c.id,
    content:    c.content?.raw ?? "",
    author:     c.user?.display_name,
    created_on: c.created_on,
    updated_on: c.updated_on,
    deleted:     c.deleted ?? false,
    inline:     c.inline ? { path: c.inline.path, from: c.inline.from, to: c.inline.to } : undefined,
  };
}

function shapeDefaultReviewer(r: BbDefaultReviewer) {
  return {
    display_name: r.display_name,
    uuid:         r.uuid,
    nickname:     r.nickname,
  };
}

function shapeStatus(s: BbCommitStatus) {
  return {
    uuid:  s.uuid,
    key:   s.key,
    name:  s.name,
    state: s.state,
    url:   s.url,
    created_on: s.created_on,
    updated_on:  s.updated_on,
  };
}

export const pullRequestTools = (client: BitbucketClient) => ({
  list_pull_requests: {
    description: "List pull requests for a repository",
    schema: z.object({
      repo_slug: RepoArg,
      state:     z.enum(["OPEN", "MERGED", "DECLINED", "SUPERSEDED"]).default("OPEN"),
      page:      z.number().int().positive().default(1),
    }),
    async handler({ repo_slug, state, page }: { repo_slug: string; state: string; page: number }) {
      const qs = new URLSearchParams({ state, page: String(page), pagelen: String(PAGE_SIZE) });
      const data = await client.get<BbPagedResponse<BbPullRequest>>(
        `/repositories/${client.workspace}/${repo_slug}/pullrequests?${qs}`
      );
      return {
        total:    data.size,
        page:     data.page,
        has_next: !!data.next,
        pull_requests: data.values.map(shapePr),
      };
    },
  },

  get_pull_request: {
    description: "Get full details of a specific pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg }),
    async handler({ repo_slug, pr_id }: { repo_slug: string; pr_id: number }) {
      const pr = await client.get<BbPullRequest>(
        prPath(client.workspace, repo_slug, pr_id)
      );
      return shapePr(pr);
    },
  },

  create_pull_request: {
    description: "Create a new pull request",
    schema: z.object({
      repo_slug:           RepoArg,
      title:               z.string().min(1),
      description:         z.string().optional(),
      source_branch:       z.string().min(1).describe("Branch to merge from"),
      destination_branch:  z.string().min(1).describe("Branch to merge into"),
      close_source_branch: z.boolean().default(false).describe("Delete source branch after merge"),
      reviewers:           z.array(z.string()).optional().describe("Reviewer usernames or UUIDs"),
    }),
    async handler(args: {
      repo_slug: string; title: string; description?: string;
      source_branch: string; destination_branch: string;
      close_source_branch: boolean; reviewers?: string[];
    }) {
      const pr = await client.post<BbPullRequest>(
        `/repositories/${client.workspace}/${args.repo_slug}/pullrequests`,
        {
          title:               args.title,
          description:         args.description ?? "",
          source:              { branch: { name: args.source_branch } },
          destination:         { branch: { name: args.destination_branch } },
          close_source_branch: args.close_source_branch,
          reviewers:           (args.reviewers ?? []).map((r) =>
            r.startsWith("{") ? { uuid: r } : { username: r }
          ),
        }
      );
      return shapePr(pr);
    },
  },

  update_pull_request: {
    description: "Update the title, description, or reviewers of a pull request",
    schema: z.object({
      repo_slug:   RepoArg,
      pr_id:       PrIdArg,
      title:       z.string().optional(),
      description: z.string().optional(),
      reviewers:   z.array(z.string()).optional(),
    }),
    async handler(args: { repo_slug: string; pr_id: number; title?: string; description?: string; reviewers?: string[] }) {
      const body: Record<string, unknown> = {};
      if (args.title)       body.title = args.title;
      if (args.description !== undefined) body.description = args.description;
      if (args.reviewers)   body.reviewers = args.reviewers.map((r) => ({ username: r }));

      const pr = await client.put<BbPullRequest>(
        prPath(client.workspace, args.repo_slug, args.pr_id),
        body
      );
      return shapePr(pr);
    },
  },

  merge_pull_request: {
    description: "Merge an open pull request",
    schema: z.object({
      repo_slug:           RepoArg,
      pr_id:               PrIdArg,
      merge_strategy:      z.enum(["merge_commit", "squash", "fast_forward"]).default("merge_commit"),
      message:             MsgArg,
      close_source_branch: z.boolean().optional(),
    }),
    async handler(args: { repo_slug: string; pr_id: number; merge_strategy: string; message?: string; close_source_branch?: boolean }) {
      const body: Record<string, unknown> = { merge_strategy: args.merge_strategy };
      if (args.message)                       body.message = args.message;
      if (args.close_source_branch !== undefined) body.close_source_branch = args.close_source_branch;

      const result = await client.post<BbPullRequest>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/merge`,
        body
      );
      return { merged: true, state: result.state };
    },
  },

  decline_pull_request: {
    description: "Decline (reject) an open pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, message: MsgArg }),
    async handler(args: { repo_slug: string; pr_id: number; message?: string }) {
      const result = await client.post<BbPullRequest>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/decline`,
        args.message ? { message: args.message } : {}
      );
      return { declined: true, state: result.state };
    },
  },

  add_pr_comment: {
    description: "Post a Markdown comment on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, content: z.string().min(1) }),
    async handler(args: { repo_slug: string; pr_id: number; content: string }) {
      const result = await client.post<BbComment>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/comments`,
        { content: { raw: args.content } }
      );
      return { id: result.id, created_on: result.created_on };
    },
  },

  get_diff: {
    description: "Get the unified diff for a pull request (truncated to 8 KB)",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg }),
    async handler(args: { repo_slug: string; pr_id: number }) {
      const diff = await client.rawText(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/diff`
      );
      const truncated = diff.length > DIFF_MAX_LEN;
      return {
        diff:      truncated ? diff.slice(0, DIFF_MAX_LEN) : diff,
        truncated,
        size:      diff.length,
      };
    },
  },

  // ── Comment tools ─────────────────────────────────────────────────────────
  list_pr_comments: {
    description: "List all comments on a pull request",
    schema: z.object({
      repo_slug: RepoArg,
      pr_id:     PrIdArg,
      page:      z.number().int().positive().default(1),
    }),
    async handler(args: { repo_slug: string; pr_id: number; page: number }) {
      const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
      const data = await client.get<BbPagedResponse<BbComment>>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/comments?${qs}`
      );
      return {
        total:    data.size,
        page:     data.page,
        has_next: !!data.next,
        comments: data.values.map(shapeComment),
      };
    },
  },

  get_pr_comment: {
    description: "Get a specific comment on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, comment_id: CommentIdArg }),
    async handler(args: { repo_slug: string; pr_id: number; comment_id: number }) {
      const c = await client.get<BbComment>(
        prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)
      );
      return shapeComment(c);
    },
  },

  update_pr_comment: {
    description: "Update a comment on a pull request",
    schema: z.object({
      repo_slug:  RepoArg,
      pr_id:      PrIdArg,
      comment_id: CommentIdArg,
      content:    z.string().min(1).describe("New comment content (Markdown)"),
    }),
    async handler(args: { repo_slug: string; pr_id: number; comment_id: number; content: string }) {
      const c = await client.put<BbComment>(
        prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id),
        { content: { raw: args.content } }
      );
      return shapeComment(c);
    },
  },

  delete_pr_comment: {
    description: "Delete a comment on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, comment_id: CommentIdArg }),
    async handler(args: { repo_slug: string; pr_id: number; comment_id: number }) {
      await client.delete(
        prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)
      );
      return { deleted: true, comment_id: args.comment_id };
    },
  },

  resolve_pr_comment: {
    description: "Resolve a comment thread on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, comment_id: CommentIdArg }),
    async handler(args: { repo_slug: string; pr_id: number; comment_id: number }) {
      await client.post(
        `${prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)}/resolve`
      );
      return { resolved: true, comment_id: args.comment_id };
    },
  },

  reopen_pr_comment: {
    description: "Reopen a resolved comment thread on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, comment_id: CommentIdArg }),
    async handler(args: { repo_slug: string; pr_id: number; comment_id: number }) {
      await client.delete(
        `${prCommentPath(client.workspace, args.repo_slug, args.pr_id, args.comment_id)}/resolve`
      );
      return { reopened: true, comment_id: args.comment_id };
    },
  },

  // ── Approval tools ─────────────────────────────────────────────────────────
  approve_pull_request: {
    description: "Approve a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg }),
    async handler(args: { repo_slug: string; pr_id: number }) {
      await client.post(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/approve`
      );
      return { approved: true, pr_id: args.pr_id };
    },
  },

  unapprove_pull_request: {
    description: "Remove your approval from a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg }),
    async handler(args: { repo_slug: string; pr_id: number }) {
      await client.delete(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/approve`
      );
      return { unapproved: true, pr_id: args.pr_id };
    },
  },

  // ── Request changes ───────────────────────────────────────────────────────
  request_pr_changes: {
    description: "Request changes on a pull request",
    schema: z.object({ repo_slug: RepoArg, pr_id: PrIdArg, message: MsgArg }),
    async handler(args: { repo_slug: string; pr_id: number; message?: string }) {
      const result = await client.post<BbPullRequest>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/request-changes`,
        args.message ? { message: args.message } : {}
      );
      return { requested_changes: true, state: result.state };
    },
  },

  // ── Commit statuses ───────────────────────────────────────────────────────
  list_pr_statuses: {
    description: "List commit/build statuses for a pull request",
    schema: z.object({
      repo_slug: RepoArg,
      pr_id:     PrIdArg,
      page:      z.number().int().positive().default(1),
    }),
    async handler(args: { repo_slug: string; pr_id: number; page: number }) {
      const qs = new URLSearchParams({ page: String(args.page), pagelen: String(PAGE_SIZE) });
      const data = await client.get<BbPagedResponse<BbCommitStatus>>(
        `${prPath(client.workspace, args.repo_slug, args.pr_id)}/statuses?${qs}`
      );
      return {
        total:    data.size,
        page:     data.page,
        has_next: !!data.next,
        statuses: data.values.map(shapeStatus),
      };
    },
  },

  // ── Default reviewers ──────────────────────────────────────────────────────
  list_default_reviewers: {
    description: "List default reviewers for a repository (auto-added to new PRs)",
    schema: z.object({ repo_slug: RepoArg }),
    async handler(args: { repo_slug: string }) {
      const qs = new URLSearchParams({ pagelen: String(PAGE_SIZE) });
      const data = await client.get<BbPagedResponse<BbDefaultReviewer>>(
        `${defaultReviewerPath(client.workspace, args.repo_slug)}?${qs}`
      );
      return {
        total:    data.size,
        reviewers: data.values.map(shapeDefaultReviewer),
      };
    },
  },

  get_default_reviewer: {
    description: "Get a specific default reviewer",
    schema: z.object({ repo_slug: RepoArg, username: UsernameArg }),
    async handler(args: { repo_slug: string; username: string }) {
      const r = await client.get<BbDefaultReviewer>(
        defaultReviewerPath(client.workspace, args.repo_slug, args.username)
      );
      return shapeDefaultReviewer(r);
    },
  },

  add_default_reviewer: {
    description: "Add a user as default reviewer for the repository",
    schema: z.object({ repo_slug: RepoArg, username: UsernameArg }),
    async handler(args: { repo_slug: string; username: string }) {
      const r = await client.put<BbDefaultReviewer | Record<string, never>>(
        defaultReviewerPath(client.workspace, args.repo_slug, args.username)
      );
      const reviewer = r && "display_name" in r ? shapeDefaultReviewer(r as BbDefaultReviewer) : { username: args.username };
      return { added: true, reviewer };
    },
  },

  remove_default_reviewer: {
    description: "Remove a user from default reviewers",
    schema: z.object({ repo_slug: RepoArg, username: UsernameArg }),
    async handler(args: { repo_slug: string; username: string }) {
      await client.delete(
        defaultReviewerPath(client.workspace, args.repo_slug, args.username)
      );
      return { removed: true, username: args.username };
    },
  },
});
