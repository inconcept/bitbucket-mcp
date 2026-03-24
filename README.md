# bitbucket-mcp

An [MCP](https://modelcontextprotocol.io) server for Bitbucket Cloud.  
Manage pull requests, branches, and repositories from any MCP-compatible client (Cursor, Claude Desktop, etc.).

## Installation

```bash
npx bitbucket-mcp
```

Or install globally:

```bash
npm install -g bitbucket-mcp
bitbucket-mcp
```

## Setup

### 1. Create a Bitbucket App Password

1. Go to **Bitbucket → Personal Settings → App Passwords**
2. Create a new password with these permissions:
   - **Repositories:** Read, Write (Write needed for delete_branch, default reviewers)
   - **Pull Requests:** Read, Write
3. Copy the generated password

### 2. Set environment variables

| Variable                 | Required | Description                               |
| ------------------------ | -------- | ----------------------------------------- |
| `BITBUCKET_USERNAME`     | ✅       | Your Bitbucket username                   |
| `BITBUCKET_APP_PASSWORD` | ✅       | App password from step 1                  |
| `BITBUCKET_WORKSPACE`    | ✅       | Workspace slug (from your Bitbucket URL)  |
| `BITBUCKET_BASE_URL`     | ❌       | Override for Bitbucket Server/Data Center |

### 3. Connect to Cursor

Add to your `~/.cursor/mcp.json` (or Cursor → Settings → MCP):

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "args": ["-y", "bitbucket-mcp"],
      "env": {
        "BITBUCKET_USERNAME": "your_username",
        "BITBUCKET_APP_PASSWORD": "your_app_password",
        "BITBUCKET_WORKSPACE": "your_workspace"
      }
    }
  }
}
```

### 4. Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "args": ["-y", "bitbucket-mcp"],
      "env": {
        "BITBUCKET_USERNAME": "your_username",
        "BITBUCKET_APP_PASSWORD": "your_app_password",
        "BITBUCKET_WORKSPACE": "your_workspace"
      }
    }
  }
}
```

## Available Tools

### Repositories

| Tool                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `list_repositories` | List repos in the workspace (supports search & pagination) |

### Pull Requests

| Tool                      | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `list_pull_requests`      | List PRs filtered by state (OPEN / MERGED / DECLINED / SUPERSEDED) |
| `get_pull_request`        | Full PR details including participants and reviewers               |
| `create_pull_request`     | Open a new PR with optional reviewers                              |
| `update_pull_request`     | Update title, description, or reviewers                            |
| `merge_pull_request`      | Merge using merge_commit, squash, or fast_forward                  |
| `decline_pull_request`    | Decline a PR with an optional message                              |
| `add_pr_comment`          | Post a Markdown comment on a PR                                    |
| `get_diff`                | Fetch the unified diff (truncated to 8 KB)                         |
| `list_pr_comments`        | List all comments on a PR                                          |
| `get_pr_comment`          | Get a specific comment                                             |
| `update_pr_comment`       | Update a comment                                                   |
| `delete_pr_comment`       | Delete a comment                                                   |
| `resolve_pr_comment`      | Resolve a comment thread                                           |
| `reopen_pr_comment`       | Reopen a resolved comment thread                                   |
| `approve_pull_request`    | Approve a PR                                                       |
| `unapprove_pull_request`  | Remove your approval                                               |
| `request_pr_changes`      | Request changes on a PR                                            |
| `list_pr_statuses`        | List commit/build statuses for a PR                                |
| `list_default_reviewers`  | List default reviewers (auto-added to new PRs)                     |
| `get_default_reviewer`    | Get a specific default reviewer                                    |
| `add_default_reviewer`    | Add a user as default reviewer                                     |
| `remove_default_reviewer` | Remove a user from default reviewers                               |

### Branches

| Tool            | Description                             |
| --------------- | --------------------------------------- |
| `list_branches` | List branches with optional name search |
| `delete_branch` | Delete a branch in a repository         |

## Example prompts

- _"List all open PRs in the backend repo"_
- _"Create a PR from feature/auth to main: 'Add OAuth login'"_
- _"Show me the diff for PR #42"_
- _"Merge PR #42 using squash"_
- _"Decline PR #15 with message: not needed anymore"_
- _"Add a comment to PR #8: 'LGTM!'"_

## Development

```bash
git clone https://github.com/inconcept/bitbucket-mcp.git
cd bitbucket-mcp
npm install
cp .env.example .env   # fill in your credentials

npm run dev            # run with tsx watch (hot reload)
npm run build          # compile TypeScript → dist/
npm run lint           # ESLint
```

## Project structure

```
├── src/
│   ├── index.ts      # CLI entry point (#!/usr/bin/env node)
│   ├── config.ts     # Env var loading + Zod validation
│   ├── client.ts     # Bitbucket REST API client
│   ├── server.ts     # MCP server wiring (list + call handlers)
│   ├── types.ts      # Bitbucket API response types
│   └── tools/
│       ├── index.ts  # Barrel — merges all tool groups
│       ├── repositories.ts
│       ├── pullrequests.ts
│       └── branches.ts
└── test/             # Vitest specs (*.test.ts)
```

## Publishing to npm

Releases are automated with **[semantic-release](https://github.com/semantic-release/semantic-release)** on every push to `main` that produces a releasable version from [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `feat!:` / `BREAKING CHANGE:`). The workflow bumps `package.json`, updates `CHANGELOG.md`, creates a Git tag and GitHub Release, and runs `npm publish`.

**Repository setup**

1. Add an **npm automation token** (or granular token with publish) as the GitHub secret **`NPM_TOKEN`** (Settings → Secrets and variables → Actions).
2. If **`main` is branch-protected**, semantic-release must be allowed to push release commits and tags. Either:
   - add a ruleset bypass for **GitHub Actions** on that branch, or use a **PAT** with `contents: write` stored as a secret and wire it into checkout per [semantic-release docs](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication); or
   - temporarily relax protection for the bot user that pushes (less ideal).

**Local manual publish** (only when you must bypass the pipeline):

```bash
npm run build
npm publish
```

Commit messages on `main` are checked with **commitlint** (husky `commit-msg` hook); use conventional commits so releases stay predictable.

## License

MIT
