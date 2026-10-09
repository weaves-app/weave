# Workspace hooks

| Hook               | Purpose                                                                                         | Blocking?                   |
| ------------------ | ----------------------------------------------------------------------------------------------- | --------------------------- |
| Git pre-commit     | Validate working branch/personal identity, staged lint/format, API boundaries/DI, SDD artifacts | Yes                         |
| Git commit-msg     | One-line imperative Conventional Commit, ticket matches branch                                  | Yes                         |
| Git pre-push       | Branch/author/committer and actual authenticated GitHub account, full lint/typecheck/tests      | Yes                         |
| Git post-commit    | Remind that CI/review still apply                                                               | No                          |
| Codex SessionStart | Load constitution/workflow context                                                              | Context                     |
| Codex PreToolUse   | Recognized source edits require ticket branch and confirmed BDD scope                           | Yes, for covered tool calls |
| Codex PostToolUse  | Prompt relevant scenario verification/evidence                                                  | Context                     |
| Codex Stop         | Completion reminder for full verification and convergence                                       | Advisory                    |

`pnpm install --frozen-lockfile`/`pnpm install` runs prepare and sets repository-local `core.hooksPath=.githooks`; CI skips Git-hook installation. First set your own personal `git config --local user.name` and `user.email`. Hooks reject repository-local forbidden identities and mismatched author/committer overrides. They do not force collaborators to impersonate the creator. Git hooks can be skipped; CI repeats the portable checks.

Codex 0.159.3 reports hooks enabled. Checked-in `.codex/hooks.json` runs the repo script from the Git root and uses the official event schema. Each developer must trust the project config and review the exact definitions via `/hooks`; changed hook hashes require review again. This setup does not silently modify global trust. See [official Codex hooks documentation](https://developers.openai.com/codex/hooks).

Pre-tool command recognition is intentionally limited; arbitrary shell/Python/MCP writes cannot be made secure through regex inspection. It is assistance, not a filesystem security boundary. Tests cover recognized source edits, read-only commands, specs and missing scenario confirmation. Stop is advisory to avoid infinite verification loops on ordinary questions. CI/branch permissions are the durable merge gate. TDD chronology, SOLID, DRY and semantic BDD coverage require evidence and review.

Do not use post-commit/post-tool hooks to auto-push, amend commits, mutate Linear tickets or deploy. Spec Kit extension hooks are a separate workflow system; none are registered in this version. Canonical instructions live in AGENTS.md/constitution/standards, not duplicated agent-specific policy files.

The active Spec Kit pointer is machine-local and intentionally ignored upstream. A fresh clone or mismatched ticket does not authorize source edits; select/create the feature first. Session context and investigation still work without a pointer.

Pre-push reads your repository-local `weave.githubUser`, resolves its scoped gh credential and verifies `/user` against that login. Missing credentials, mismatched labels and the company account block publication. An optional local `weave.ghConfigDir` selects an isolated gh profile. No token is logged or committed. Git credential configuration must use the same profile; the setup owner verifies that mapping before publishing.

## Claude Code support

CLAUDE.md imports root/scoped AGENTS.md. `.claude/skills` links to the same pinned Spec Kit skills, avoiding a second copy. `.claude/settings.json` registers SessionStart, PreToolUse, PostToolUse and Stop with the shared stdin/JSON handler and a 10-second timeout, following [Claude hooks](https://code.claude.com/docs/en/hooks). Developers review workspace trust and `/hooks` in each agent; no global permissions are changed. Stop is advisory and never requests unconditional continuation. Tests exercise real handler JSON for Claude event fixtures, not an interactive Claude session.

Set repeatable `git config --local --add weave.forbiddenIdentity ACCOUNT_OR_EMAIL` for any prohibited identity. The list remains local and uncommitted. Expected GitHub login is `weave.githubUser`; actual API identity must match. Shell mutation recognition considers destination paths and ignores quoted arrows/comparisons/descriptor duplication; it is deliberately not a complete shell interpreter or security boundary.
