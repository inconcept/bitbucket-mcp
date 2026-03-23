/**
 * Enforces Conventional Commits so semantic-release can infer the next semver
 * from history (feat/fix/BREAKING CHANGE, etc.).
 */
export default {
  extends: ["@commitlint/config-conventional"],
};
