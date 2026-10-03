<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Weave workspace rules

- Read `.specify/memory/constitution.md`, `docs/standards/README.md` and the scoped app instructions before implementation. They are authoritative together; report conflicts.
- Use GitHub Spec Kit: specify → clarify → plan → tasks → analyze → implement → converge. Installed skills are under `.agents/skills/speckit-*`. The pinned upstream helper persists a numbered spec directory without changing the Git branch. Git branches keep `feat/WEA-N/slug` format.
- Before source changes, agree BDD happy/sad/edge scenarios, record confirmation in the feature's `workflow.json`, and identify public test seams. Each authored behavior follows meaningful RED → GREEN → REFACTOR; save actual evidence, never claim import/tooling failures as behavioral red.
- Set `.specify/feature.json` to the active feature. Feature artifacts: spec, plan, tasks, workflow, evidence and convergence. Keep ticket/scenario/test traceability. Each ticket has its own spec; do not reuse WEA-6 for unrelated work.
- Follow Google's TypeScript guide as mapped in `docs/standards/typescript.md`. Strict types, interfaces for object contracts, single quotes, semicolons, named exports, readonly inputs, unknown at runtime boundaries. Framework-required entrypoints/config exports and generated code are documented exceptions.
- Follow SOLID, DRY, DDD and Clean Architecture. Domain/application code stays framework-free. Use published cross-module contracts. Inject authored service dependencies as interface types with explicit tokens. Concrete implementations are wired only in composition roots.
- Reuse UI primitives and semantic design tokens. Share contracts/tokens; web/native renderers remain platform-specific. Review accessibility and consistent states.
- Work only on ticket branches from develop. No direct main/develop commits, force pushes or protection bypasses. Weave uses personal credentials; never use a forbidden company identity. Pin each contributor's own personal Git name/email in repository-local config and verify author and committer before publishing.
- Commits: one imperative Conventional Commit, max 100 characters, ending `[WEA-N]` matching branch. Use `!` for breaking changes. Maintain verb vocabulary in `scripts/policy.mjs` through reviewed changes.
- Run relevant tests after each slice; `npm run verify` and database integration before PR. Add specs/evidence links to PR. CI checks and code-owner review are required; local hooks are bypassable.
- Main releases use SemVer and immutable digests. Develop images use commit SHA only. Promote the same image; supply configuration at runtime. Never rebuild a released version for an environment.

- Codex and Claude Code are supported. Claude loads CLAUDE.md and the shared Spec Kit skills/hooks. Review project hook trust in each agent.
- Dependency bot proposals cannot merge without adoption into a fresh ticket/spec branch. Keep full required checks.
