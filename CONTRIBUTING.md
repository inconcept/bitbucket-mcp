# Contributing

## Development

```bash
git clone https://github.com/inconcept/bitbucket-mcp.git
cd bitbucket-mcp
npm install
cp .env.example .env   # fill in your credentials

npm run dev            # run with tsx watch (hot reload)
npm run build          # compile TypeScript → dist/
npm run lint           # ESLint
npm test               # Vitest
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

### Repository setup

1. Add an **npm automation token** (or granular token with publish) as the GitHub secret **`NPM_TOKEN`** (Settings → Secrets and variables → Actions).
2. If **`main` is branch-protected**, semantic-release must be allowed to push release commits and tags. Either:
   - add a ruleset bypass for **GitHub Actions** on that branch, or use a **PAT** with `contents: write` stored as a secret and wire it into checkout per [semantic-release docs](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/ci-configuration.md#authentication); or
   - temporarily relax protection for the bot user that pushes (less ideal).

### Local manual publish

Only when you must bypass the pipeline:

```bash
npm run build
npm publish
```

Commit messages on `main` are checked with **commitlint** (husky `commit-msg` hook); use conventional commits so releases stay predictable.
