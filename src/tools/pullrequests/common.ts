import { z } from "zod";
import type { BbPullRequest, BbComment, BbDefaultReviewer, BbCommitStatus } from "../../types.js";

export const RepoArg = z.string().min(1).describe("Repository slug");
export const PrIdArg = z.number().int().positive().describe("Pull request ID");
export const MsgArg = z.string().optional().describe("Optional message");
export const CommentIdArg = z.number().int().positive().describe("Comment ID");
export const UsernameArg = z.string().min(1).describe("Bitbucket username");

export function prPath(workspace: string, repo: string, prId: number): string {
  return `/repositories/${workspace}/${repo}/pullrequests/${prId}`;
}

export function prCommentPath(
  workspace: string,
  repo: string,
  prId: number,
  commentId: number,
): string {
  return `${prPath(workspace, repo, prId)}/comments/${commentId}`;
}

export function defaultReviewerPath(workspace: string, repo: string, username?: string): string {
  const base = `/repositories/${workspace}/${repo}/default-reviewers`;
  return username ? `${base}/${encodeURIComponent(username)}` : base;
}

export function shapePr(pr: BbPullRequest) {
  return {
    id: pr.id,
    title: pr.title,
    description: pr.description ?? "",
    state: pr.state,
    author: pr.author?.display_name,
    source_branch: pr.source?.branch?.name,
    destination_branch: pr.destination?.branch?.name,
    reviewers: pr.reviewers?.map((r) => r.display_name) ?? [],
    participants:
      pr.participants?.map((p) => ({
        name: p.user?.display_name,
        role: p.role,
        approved: p.approved,
      })) ?? [],
    created_on: pr.created_on,
    updated_on: pr.updated_on,
    url: pr.links?.html?.href,
  };
}

export function shapeComment(c: BbComment) {
  return {
    id: c.id,
    content: c.content?.raw ?? "",
    author: c.user?.display_name,
    created_on: c.created_on,
    updated_on: c.updated_on,
    deleted: c.deleted ?? false,
    inline: c.inline ? { path: c.inline.path, from: c.inline.from, to: c.inline.to } : undefined,
  };
}

export function shapeDefaultReviewer(r: BbDefaultReviewer) {
  return {
    display_name: r.display_name,
    uuid: r.uuid,
    nickname: r.nickname,
  };
}

export function shapeStatus(s: BbCommitStatus) {
  return {
    uuid: s.uuid,
    key: s.key,
    name: s.name,
    state: s.state,
    url: s.url,
    created_on: s.created_on,
    updated_on: s.updated_on,
  };
}
