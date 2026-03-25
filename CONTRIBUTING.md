# Contributing

Thanks for your interest in contributing to **Bitbucket MCP**! This guide covers everything you need to get started.

## Prerequisites

- **Node.js 22+** (see `engines` in `package.json`)
- A **Bitbucket Cloud** account (for manual integration testing)

## Getting started

```bash
git clone https://github.com/inconcept/bitbucket-mcp.git
cd bitbucket-mcp
npm install
cp .env.example .env   # fill in your credentials

npm run dev            # run with tsx watch (hot reload)
npm run build          # compile TypeScript → dist/
npm run typecheck      # tsc --noEmit (src + test)
npm run lint           # ESLint
npm run format         # Prettier (auto-fix)
npm run format:check   # Prettier (check only)
npm test               # Vitest
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Vitest with coverage
```

## Project structure

```
├── src/
│   ├── index.ts       # CLI entry point (#!/usr/bin/env node)
│   ├── config.ts      # Env var loading + Zod validation
│   ├── client.ts      # Bitbucket REST API client
│   ├── server.ts      # MCP server (McpServer + registerAllTools)
│   ├── types.ts       # Bitbucket API response types
│   └── tools/
│       ├── index.ts   # Tool class imports, TOOLS instances, registerAllTools, buildTools (tests)
│       ├── bitbucket-mcp-tool.ts  # Abstract BitbucketMcpTool (execute + register → JSON MCP result)
│       ├── constants.ts, helpers.ts
│       ├── repositories/
│       │   ├── index.ts          # Barrel: re-exports tool classes
│       │   └── list-repositories.ts   # export class ListRepositoriesTool …
│       ├── branches/
│       │   ├── index.ts
│       │   ├── list-branches.ts, delete-branch.ts
│       └── pullrequests/
│           ├── index.ts        # Barrel: all PR-related tool classes
│           ├── common.ts       # Shared Zod args + URL helpers (not a tool)
│           └── *.ts            # One export class …Tool per file
└── test/              # Vitest specs (*.test.ts)
```

## Tools architecture

- Each MCP tool is a **class** extending `**BitbucketMcpTool<TSchema>`\*\* (`src/tools/bitbucket-mcp-tool.ts`). Subclasses define `toolName`, `description`, a Zod `schema`, and `execute(client, args)`.
- `**register()**` on the base class wires `server.registerTool` and returns JSON text via `toolJsonResult` (`helpers.ts`).
- `**src/tools/index.ts**` imports each tool class from `**repositories/index.ts**`, `**branches/index.ts**`, and `**pullrequests/index.ts**` (barrel files), then `**new …Tool()**` for each entry in the `**TOOLS**` array. That single list drives `**registerAllTools**` and `**buildTools**` (unit tests).
- **Destructive tools** (`delete_branch`, `delete_pr_comment`) are gated by `**BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS`\*\*: they are omitted from registration when the flag is off.

## How to add a new tool

Follow these steps when adding a new tool (e.g. `create_branch`).

### 1. Create the tool file

Add a file in the appropriate domain folder. Pick the folder that matches the Bitbucket resource (`repositories/`, `branches/`, or `pullrequests/`).

```
src/tools/branches/create-branch.ts
```

Use an existing tool as a template. Every tool file follows this pattern:

```typescript
import { z } from "zod";
import type { BitbucketClient } from "../../client.js";
import { BitbucketMcpTool } from "../bitbucket-mcp-tool.js";

// 1. Define a Zod schema for the tool's input arguments.
const createBranchSchema = z.object({
  repo_slug: z.string().min(1).describe("Repository slug"),
  branch_name: z.string().min(1).describe("Name for the new branch"),
  target_hash: z.string().min(1).describe("Commit hash to branch from"),
});

// 2. Export a class extending BitbucketMcpTool.
export class CreateBranchTool extends BitbucketMcpTool<typeof createBranchSchema> {
  readonly toolName = "create_branch" as const;
  readonly description = "Create a new branch in a repository";
  readonly schema = createBranchSchema;

  // 3. Implement execute(). It receives a typed BitbucketClient and parsed args.
  async execute(client: BitbucketClient, args: z.infer<typeof createBranchSchema>) {
    const { repo_slug, branch_name, target_hash } = args;
    const data = await client.post(`/repositories/${client.workspace}/${repo_slug}/refs/branches`, {
      name: branch_name,
      target: { hash: target_hash },
    });
    return { name: data.name, target: data.target?.hash };
  }
}
```

### 2. Export from the barrel file

Add the class to the domain's `index.ts` barrel:

```typescript
// src/tools/branches/index.ts
export { ListBranchesTool } from "./list-branches.js";
export { DeleteBranchTool } from "./delete-branch.js";
export { CreateBranchTool } from "./create-branch.js"; // ← new
```

### 3. Register in the TOOLS array

Import the class in `src/tools/index.ts` and add a `new CreateBranchTool()` to the `TOOLS` array:

```typescript
import { CreateBranchTool, DeleteBranchTool, ListBranchesTool } from "./branches/index.js";

const TOOLS: ReadonlyArray<BitbucketMcpTool<z.ZodType>> = [
  // …existing tools…
  new CreateBranchTool(),
];
```

If the tool is **destructive** (deletes data), also add its name to `GATED_DESTRUCTIVE_TOOL_NAMES`.

### 4. Add a test case

Add an entry to `test/tools/all-tool-classes.test.ts` in the `TOOL_CASES` array:

```typescript
{
  name: "create_branch",
  Tool: CreateBranchTool,
  args: { repo_slug: "r", branch_name: "b", target_hash: "abc123" },
  prepare: (c) => {
    vi.mocked(c.post).mockResolvedValue({ name: "b", target: { hash: "abc123" } });
  },
},
```

Update the tool count assertion at the bottom of that file to match.

### 5. Update the README

Add a row to the appropriate table in the "Available tools" section of `README.md`.

### 6. Verify

```bash
npm run typecheck && npm test && npm run lint
```

## Code style

This project uses **ESLint** and **Prettier**. Both run automatically on staged files via a **husky pre-commit hook** (`lint-staged`), so you don't need to run them manually — but you can:

```bash
npm run lint           # check for lint issues
npm run format         # auto-format all files
```

Key conventions:

- One tool class per file, named `kebab-case.ts` (e.g. `list-branches.ts`).
- Class name matches the file: `ListBranchesTool`.
- Tool names use `snake_case` (e.g. `list_branches`).
- Keep files small and focused (< 200 lines).
- Use Zod `.describe()` on every schema field — these descriptions surface in MCP clients.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) enforced by **commitlint** (husky `commit-msg` hook). Semantic-release reads commit messages to determine the next version, so correct prefixes matter.

## Testing

Run `**npm test**` (and `**npm run typecheck**`) before pushing.

When adding a new tool, at minimum add a case to `test/tools/all-tool-classes.test.ts`. For complex logic, add a dedicated `test/tools/<tool-name>.test.ts` file following the `list-pr-statuses.test.ts` pattern.

## Submitting a pull request

1. **Fork** the repo and create a branch from `main` (e.g. `feat/create-branch`).
2. Make your changes, keeping commits small and following the commit message format above.
3. Run the full check suite: `npm run typecheck && npm test && npm run lint`.
4. Open a PR against `main`. Describe **what** you changed and **why**.
5. Link any related issues (e.g. `Closes #12`).

A maintainer will review your PR. Please be patient — we aim to respond within a few days.

## Reporting issues

Found a bug or have a feature request? [Open an issue](https://github.com/inconcept/bitbucket-mcp/issues) with:

- **Bug reports:** Steps to reproduce, expected vs. actual behavior, Node version, and any error messages.
- **Feature requests:** A clear description of the use case and what you'd like the tool to do.

## Publishing to npm

Releases are automated with **[semantic-release](https://github.com/semantic-release/semantic-release)** on every push to `main` that produces a releasable version from [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `feat!:` / `BREAKING CHANGE:`). The workflow bumps `package.json`, updates `CHANGELOG.md`, creates a Git tag and GitHub Release, and runs `npm publish`.

### Repository setup

1. Add an **npm automation token** (or granular token with publish) as the GitHub secret `**NPM_TOKEN`\*\* (Settings → Secrets and variables → Actions).
2. If `**main` is branch-protected\*\*, semantic-release must be allowed to push release commits and tags. Either:

- add a ruleset bypass for **GitHub Actions** on that branch, or use a **PAT** with `contents: write` stored as a secret and wire it into checkout per [semantic-release docs](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication); or
- temporarily relax protection for the bot user that pushes (less ideal).

### Local manual publish

Only when you must bypass the pipeline:

```bash
npm run build
npm publish
```

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
