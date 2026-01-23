// Conventional Commits rules: type(scope?): subject (e.g., "feat: add upload flow", "fix(api): handle 429").
// Common types:
// - feat: new user-facing functionality
// - fix: bug fix or regression
// - chore: tooling or maintenance work
// - docs: documentation-only changes
// - refactor: code change without behavior change
// - test: add or update tests
// - ci: CI/CD configuration or pipeline updates
// - build: build system or dependency changes
// - perf: performance improvements
// - style: formatting-only changes (no logic)
// - revert: revert a previous commit
export default {
  extends: ['@commitlint/config-conventional']
}
