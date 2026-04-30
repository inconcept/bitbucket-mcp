# Resolve repo default merge strategy via the PR object

When `merge_pull_request` is called without an explicit `merge_strategy`, we GET the pull request and use `destination.branch.default_merge_strategy` (falling back to `merge_commit` if absent).

Two non-obvious Bitbucket Cloud API facts drove this:

1. **The merge endpoint hardcodes `merge_commit` when `merge_strategy` is omitted.** The body schema declares `"default": "merge_commit"`. Omitting the field does NOT make Bitbucket honor the repository's configured default — so we must resolve it client-side.
2. **The resolved default is exposed directly on the PR object.** `PullRequest.destination.branch.default_merge_strategy` already reflects the repo's configured default for that destination branch (Bitbucket performs prefix-matching against the branching model server-side). The `branching-model/settings` endpoint does not expose merge strategy fields per its public spec, so replicating resolution client-side would be both redundant and incomplete.

## Considered options

- **Omit `merge_strategy` and let the server default**: rejected — server defaults to hardcoded `merge_commit`, ignoring repo config.
- **Fetch `branching-model/settings` and do prefix-matching client-side**: rejected — the public spec doesn't expose merge strategy fields on that resource, and the PR object already carries the resolved value.
