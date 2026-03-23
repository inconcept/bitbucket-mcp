// ── Bitbucket REST API response shapes ───────────────────────────────────────

export interface BbUser {
  display_name: string;
  uuid: string;
  nickname?: string;
  account_id?: string;
}

export interface BbBranch {
  name: string;
  target: { hash: string; date?: string };
}

export interface BbPullRequest {
  id: number;
  title: string;
  description?: string;
  state: "OPEN" | "MERGED" | "DECLINED" | "SUPERSEDED";
  author: BbUser;
  source: { branch: BbBranch; repository?: { full_name: string } };
  destination: { branch: BbBranch };
  reviewers: BbUser[];
  participants: Array<{ user: BbUser; role: string; approved: boolean }>;
  created_on: string;
  updated_on: string;
  close_source_branch: boolean;
  links: { html: { href: string } };
}

export interface BbRepository {
  name: string;
  slug: string;
  description: string;
  language: string;
  is_private: boolean;
  updated_on: string;
  links: { html: { href: string } };
}

export interface BbComment {
  id: number;
  created_on: string;
  updated_on?: string;
  content: { raw: string };
  user?: BbUser;
  deleted?: boolean;
  inline?: { path?: string; from?: number; to?: number };
  parent?: { id: number };
}

export interface BbDefaultReviewer {
  display_name: string;
  uuid: string;
  nickname?: string;
  account_id?: string;
}

export interface BbCommitStatus {
  uuid: string;
  key: string;
  name?: string;
  state: "SUCCESSFUL" | "FAILED" | "INPROGRESS" | "STOPPED";
  url?: string;
  created_on?: string;
  updated_on?: string;
}

export interface BbPagedResponse<T> {
  values: T[];
  size: number;
  page: number;
  pagelen: number;
  next?: string;
}
