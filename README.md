# Bitbucket MCP

[![npm version](https://img.shields.io/npm/v/@inconcept-labs/bitbucket-mcp.svg)](https://www.npmjs.com/package/@inconcept-labs/bitbucket-mcp)

An [MCP](https://modelcontextprotocol.io) server for [Bitbucket](https://bitbucket.org). It talks to the **Bitbucket Cloud** REST API by default (`https://api.bitbucket.org/2.0`). You can point it at **Bitbucket Server or Data Center** with `BITBUCKET_BASE_URL` if your instance exposes a compatible API; not every endpoint may match Cloud behavior.

Use it from any MCP-capable client (Cursor, Claude Desktop, Codex, and others) to work with pull requests, branches, and repositories in natural language.

## Prerequisites

- **Node.js 24 or newer** (required by this package)

## Installation

Run the published package with `npx` (recommended):

```bash
npx -y @inconcept-labs/bitbucket-mcp
```

Or install globally and run the CLI binary `bitbucket-mcp`:

```bash
npm install -g @inconcept-labs/bitbucket-mcp
bitbucket-mcp
```

## Setup

### 1. Create a Bitbucket App Password

1. Go to **Bitbucket → Personal Settings → App Passwords**
2. Create a new password with these permissions:
   - **Repositories:** Read, Write (Write needed for `delete_branch`, default reviewers)
   - **Pull Requests:** Read, Write
3. Copy the generated password

Keep app passwords out of source control. Put them only in your MCP client’s `env` block or in a local environment that is not committed.

### 2. Environment variables

| Variable                                | Required | Description                                                                                                                                                      |
| --------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BITBUCKET_USERNAME`                    | Yes      | Your Bitbucket username                                                                                                                                          |
| `BITBUCKET_APP_PASSWORD`                | Yes      | App password from step 1                                                                                                                                         |
| `BITBUCKET_WORKSPACE`                   | Yes      | Workspace slug (from your Bitbucket URL)                                                                                                                         |
| `BITBUCKET_BASE_URL`                    | No       | API base URL (default: `https://api.bitbucket.org/2.0`). Use for Server/DC.                                                                                      |
| `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS` | No       | Set to `true`, `1`, `yes`, or `on` to register **`delete_branch`** and **`delete_pr_comment`**. Off by default so those tools are not exposed unless you opt in. |

### 3. MCP client configuration

Add a server entry that runs `npx` with the scoped package and passes the variables above. Example:

```json
{
  "mcpServers": {
    "bitbucket": {
      "command": "npx",
      "args": ["-y", "@inconcept-labs/bitbucket-mcp"],
      "env": {
        "BITBUCKET_USERNAME": "your_username",
        "BITBUCKET_APP_PASSWORD": "your_app_password",
        "BITBUCKET_WORKSPACE": "your_workspace"
      }
    }
  }
}
```

**Where to put this**

- **Cursor:** `~/.cursor/mcp.json`, or **Cursor → Settings → MCP**
- **Claude Desktop (macOS):** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows):** `%APPDATA%\Claude\claude_desktop_config.json`

Merge the `bitbucket` block into the existing `mcpServers` object if you already have other servers configured.

## Available tools

### Repositories

| Tool                | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| `list_repositories` | List repos in the workspace (supports search & pagination) |

### Pull requests

| Tool                      | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `list_pull_requests`      | List PRs filtered by state (OPEN / MERGED / DECLINED / SUPERSEDED)  |
| `get_pull_request`        | Full PR details including participants and reviewers                |
| `create_pull_request`     | Open a new PR with optional reviewers                               |
| `update_pull_request`     | Update title, description, or reviewers                             |
| `merge_pull_request`      | Merge using merge_commit, squash, or fast_forward                   |
| `decline_pull_request`    | Decline a PR with an optional message                               |
| `add_pr_comment`          | Post a Markdown comment on a PR                                     |
| `get_diff`                | Fetch the unified diff (truncated to 8 KB)                          |
| `list_pr_comments`        | List all comments on a PR                                           |
| `get_pr_comment`          | Get a specific comment                                              |
| `update_pr_comment`       | Update a comment                                                    |
| `delete_pr_comment`       | Delete a comment (requires `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS`) |
| `resolve_pr_comment`      | Resolve a comment thread                                            |
| `reopen_pr_comment`       | Reopen a resolved comment thread                                    |
| `approve_pull_request`    | Approve a PR                                                        |
| `unapprove_pull_request`  | Remove your approval                                                |
| `request_pr_changes`      | Request changes on a PR                                             |
| `list_pr_statuses`        | List commit/build statuses for a PR                                 |
| `list_default_reviewers`  | List default reviewers (auto-added to new PRs)                      |
| `get_default_reviewer`    | Get a specific default reviewer                                     |
| `add_default_reviewer`    | Add a user as default reviewer                                      |
| `remove_default_reviewer` | Remove a user from default reviewers                                |

### Branches

| Tool            | Description                                                        |
| --------------- | ------------------------------------------------------------------ |
| `list_branches` | List branches with optional name search                            |
| `delete_branch` | Delete a branch (requires `BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS`) |

## Example prompts

- _"List all open PRs in the backend repo"_
- _"Create a PR from feature/auth to main: 'Add OAuth login'"_
- _"Show me the diff for PR #42"_
- _"Merge PR #42 using squash"_
- _"Decline PR #15 with message: not needed anymore"_
- _"Add a comment to PR #8: 'LGTM!'"_

## Troubleshooting

- **Configuration error on startup** — One or more required env vars are missing or empty. Set `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`, and `BITBUCKET_WORKSPACE`, then restart the MCP client.
- **401 / 403 from Bitbucket** — Wrong username or app password, or the app password lacks the scopes listed above. Regenerate the app password if needed.
- **404 or “not found” for repos** — Check `BITBUCKET_WORKSPACE` matches the workspace **slug** in the URL (not the display name).

## Testing

Pull request CI runs **ESLint → Prettier → unit tests (`npm test`) → build (`npm run build`) → MCP stdio integration tests (`npm run test:integration`)**. Integration tests need the compiled `dist/` output. For local commands, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

For development, project layout, and release automation, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Links

- [Package on npm](https://www.npmjs.com/package/@inconcept-labs/bitbucket-mcp)
- [Issues](https://github.com/inconcept/bitbucket-mcp/issues)
- [Repository](https://github.com/inconcept/bitbucket-mcp)

## License

MIT
