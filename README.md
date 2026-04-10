# Bitbucket MCP

[![npm version](https://img.shields.io/npm/v/@inconcept-labs/bitbucket-mcp.svg)](https://www.npmjs.com/package/@inconcept-labs/bitbucket-mcp)

An [MCP](https://modelcontextprotocol.io) server for [Bitbucket Cloud](https://bitbucket.org). Use it from any MCP-capable client (Cursor, Claude Desktop, Codex, and others) to manage pull requests, branches, and repositories in natural language.

It targets the Bitbucket Cloud REST API at `https://api.bitbucket.org/2.0` by default. You can point it at a Bitbucket Server / Data Center instance with `BITBUCKET_BASE_URL`, but only endpoints that match the Cloud API shape are guaranteed to work.

## Prerequisites

- **Node.js 24 or newer**
- A Bitbucket Cloud account with access to the workspace you want to use

## Installation

Run the published package directly with `npx` (recommended — no install step):

```bash
npx -y @inconcept-labs/bitbucket-mcp
```

Or install globally and run the `bitbucket-mcp` binary:

```bash
npm install -g @inconcept-labs/bitbucket-mcp
bitbucket-mcp
```

The server speaks MCP over stdio and is meant to be launched by an MCP client, not run by hand.

## Setup

### 1. Create an Atlassian API token

This server authenticates with a scoped Atlassian **API token**. (Bitbucket Cloud app passwords are deprecated — new ones can no longer be created since 2025-09-09, and any remaining ones stop working on 2026-06-09.)

1. Sign in to Bitbucket, click your avatar (top-right) → **Account settings**.
2. Open the **Security** tab → **Create and manage API tokens** → **Create API token with scopes**.
3. Give the token a name and an expiry date, then select **Bitbucket** as the app.
4. Select these scopes:
   - `read:repository:bitbucket`
   - `write:repository:bitbucket`
   - `read:pullrequest:bitbucket`
   - `write:pullrequest:bitbucket`
5. Click **Create token** and copy the value immediately — Atlassian only displays it once.

### 2. Find your workspace slug and Atlassian email

- **Workspace slug:** the path segment in your Bitbucket URL — e.g. for `https://bitbucket.org/acme-inc/some-repo`, the slug is `acme-inc`. Use the slug, not the workspace display name.
- **Atlassian email:** the email address you sign in to Atlassian with. API tokens authenticate as `email:token` — your Bitbucket username will _not_ work.

### 3. Environment variables

| Variable                                | Required | Description                                                                                                                                              |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BITBUCKET_USERNAME`                    | Yes      | Your **Atlassian account email** (used as the Basic-auth username paired with the API token).                                                            |
| `BITBUCKET_APP_PASSWORD`                | Yes      | Your **Atlassian API token** from step 1. The variable is named `APP_PASSWORD` for backward compatibility.                                               |
| `BITBUCKET_WORKSPACE`                   | Yes      | Workspace slug from your Bitbucket URL.                                                                                                                  |
| `BITBUCKET_BASE_URL`                    | No       | API base URL. Defaults to `https://api.bitbucket.org/2.0`. Override only for Bitbucket Server / Data Center.                                             |
| `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS` | No       | Set to `true`, `1`, `yes`, or `on` to expose `delete_branch` and `delete_pr_comment`. Off by default — these tools are not registered unless you opt in. |

### 4. MCP client configuration

Add a server entry that runs the package with `npx` and passes the variables above. Example:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "args": ["-y", "@inconcept-labs/bitbucket-mcp"],
      "env": {
        "BITBUCKET_USERNAME": "you@example.com",
        "BITBUCKET_APP_PASSWORD": "your_atlassian_api_token",
        "BITBUCKET_WORKSPACE": "your_workspace_slug"
      }
    }
  }
}
```

**Where this file lives**

- **Cursor:** `~/.cursor/mcp.json`, or **Cursor → Settings → MCP**
- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows):** `%APPDATA%\Claude\claude_desktop_config.json`

After saving, restart the MCP client so it picks up the new server.

## Available tools

### Repositories

| Tool                | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `list_repositories` | List repos in the workspace (supports search & pagination). |

### Pull requests

| Tool                      | Description                                                                 |
| ------------------------- | --------------------------------------------------------------------------- |
| `list_pull_requests`      | List PRs filtered by state (`OPEN` / `MERGED` / `DECLINED` / `SUPERSEDED`). |
| `get_pull_request`        | Full PR details including participants and reviewers.                       |
| `create_pull_request`     | Open a new PR with optional reviewers.                                      |
| `update_pull_request`     | Update title, description, or reviewers.                                    |
| `merge_pull_request`      | Merge using `merge_commit`, `squash`, or `fast_forward`.                    |
| `decline_pull_request`    | Decline a PR with an optional message.                                      |
| `add_pr_comment`          | Post a Markdown comment on a PR.                                            |
| `get_diff`                | Fetch the unified diff (truncated for safety).                              |
| `list_pr_comments`        | List all comments on a PR.                                                  |
| `get_pr_comment`          | Get a specific comment.                                                     |
| `update_pr_comment`       | Update a comment.                                                           |
| `delete_pr_comment`       | Delete a comment (requires `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS`).        |
| `resolve_pr_comment`      | Resolve a comment thread.                                                   |
| `reopen_pr_comment`       | Reopen a resolved comment thread.                                           |
| `approve_pull_request`    | Approve a PR.                                                               |
| `unapprove_pull_request`  | Remove your approval.                                                       |
| `request_pr_changes`      | Request changes on a PR.                                                    |
| `list_pr_statuses`        | List commit / build statuses for a PR.                                      |
| `list_default_reviewers`  | List default reviewers (auto-added to new PRs).                             |
| `get_default_reviewer`    | Get a specific default reviewer.                                            |
| `add_default_reviewer`    | Add a user as default reviewer.                                             |
| `remove_default_reviewer` | Remove a user from default reviewers.                                       |

### Branches

| Tool            | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| `list_branches` | List branches with optional name search.                            |
| `delete_branch` | Delete a branch (requires `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS`). |

## Example prompts

- _"List all open PRs in the backend repo"_
- _"Create a PR from feature/auth to main: 'Add OAuth login'"_
- _"Show me the diff for PR #42"_
- _"Merge PR #42 using squash"_
- _"Decline PR #15 with message: not needed anymore"_
- _"Add a comment to PR #8: 'LGTM!'"_

## Troubleshooting

- **`Configuration error` on startup** — One or more required env vars are missing or empty. Set `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`, and `BITBUCKET_WORKSPACE`, then restart the MCP client.
- **`401 Unauthorized`** — Most often one of:
  - `BITBUCKET_USERNAME` is your Bitbucket username instead of your **Atlassian email** — API tokens require the email.
  - The API token is wrong, expired, or was created without the scopes listed above.
  - You're still using a legacy app password — create an API token instead (app passwords are being phased out).
- **`403 Forbidden`** — The token authenticates but is missing a scope for the tool you ran. Re-create the token and add the missing scope (e.g. `write:pullrequest:bitbucket` for merge/approve, `write:repository:bitbucket` for `delete_branch`).
- **`404 Not Found` for repos** — `BITBUCKET_WORKSPACE` is wrong. Use the **slug** from the URL (e.g. `acme-inc`), not the workspace display name.
- **Destructive tool not found** — `delete_branch` and `delete_pr_comment` are not registered unless `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS` is set to a truthy value. Set it and restart the client.

## Contributing

For development, project layout, testing, and release automation, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Links

- [Atlassian: Create an API token](https://support.atlassian.com/bitbucket-cloud/docs/create-an-api-token/)
- [Atlassian: API token permissions](https://support.atlassian.com/bitbucket-cloud/docs/api-token-permissions/)

## License

MIT
