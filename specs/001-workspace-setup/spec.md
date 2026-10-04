# WEA-6: Complete workspace foundation

Ticket: https://linear.app/weaveapp/issue/WEA-6/set-up-workspace-coding-standards-and-spec-driven-development
Branch: feat/WEA-6/setup-development-workflow
Created: 2026-10-03
Status: scope confirmed by user instruction to continue; Expo selected

## User scenarios

P1: A contributor clones one workspace and can install, typecheck, test and build the API, web and mobile without copying business logic.
P1: An agent follows the constitution and feature artifacts, writes behavioral tests first, and receives actionable feedback for policy violations.
P1: A maintainer reviews a ticket-linked PR with reproducible checks and explicit release-source policy.

## Acceptance scenarios and seams

- S01: Given a valid feat/WEA-6/slug branch, when policy validation runs, then it passes; malformed/no-ticket/shared working branch names fail.
- S02: Given a one-line feat/fix or breaking ! commit with WEA ticket, when validation runs, then it passes; multiline/no-ticket/invalid-type messages fail. Automation exemptions are narrow and documented.
- S03: Given a PR from develop in this repository to main, when release-source validation runs, then it passes; feature/fork PRs to main fail. PRs to develop require matching ticket/branch/title.
- S04: Given a domain/application import of infrastructure/framework/ORM or a cross-context internal import, when architecture checking runs, then it fails; contracts and composition wiring pass.
- S05: Given an authored concrete service constructor dependency, when DI checking runs, then it fails; interface-typed consumers pass. Provider-wiring tests resolve canonical tokens.
- S06: Given an API without database availability, health returns ok and readiness returns 503; with PostgreSQL ready, readiness returns ok.
- S07: Given an API client receives valid health JSON it reports connected; malformed JSON, non-2xx and network failures report unavailable without leaking secrets.
- S08: Given a mobile user sees the starter screen, reusable text/button primitives use tokens and accessible roles; disabled/loading variants do not invoke actions.
- S09: Given a fresh PostgreSQL instance, committed migrations apply; repository behavior remains valid after migration and repeated deploy is idempotent.
- S10: Given agent hook input, policy supplies context, validates feature prerequisites before supported source edits, and reports failures; read-only/research work remains possible. Hook failure/coverage limits are documented.
- S11: Given CI on the PR, stable named checks cover policies, lint/format/types/tests/build and DB integration. Required checks and code owners are enabled without inventing unavailable check names.
- S12: Given official release tags, mutation/deletion is blocked; authorized creation will use a dedicated automation identity. No AWS deployment or SemVer release occurs during workspace setup.

Coverage: valid, rejection, dependency unavailable, malformed input, repeat operation and runtime variants. Concurrency is handled by serialized release design; no production rollout is in scope. Device/native-store execution needs simulator/device tooling and is reported separately from bundle validation.

## Success criteria

All automated validation passes locally and in GitHub CI. PR links WEA-6 and artifacts. No secret/generated dependency directories committed. Main/develop protections and required checks are verified via API. Expo native bundles are exported and mobile component tests run; simulator checks only claimed if performed.

## Approved review remediation

User approved on 2026-10-03. Existing WEA-6 scope; no unrelated product changes.

- S13: Personal credentials are validated with local forbidden identities; missing/mismatched/forbidden credentials fail closed. Public files contain generic identities only. Existing Git history is preserved.
- S14: Workspace lint/types/tests/build use shared configuration and Turbo. Unchanged unit checks hit cache; source/shared config changes invalidate dependents. Live integration is uncached. API/web pruned containers retain nonroot and health behavior.
- S15: Codex and Claude share rules/hooks. Read-only shell arrows, comparisons and descriptor duplication pass; unconfirmed source writes fail. Missing/foreign feature state fails closed.
- S16: Push artifacts are built once, tested by immutable reference before official release; every published platform is tested. PRs never publish. Production requires matching QA evidence; malformed/mismatched manifests and partial releases are rejected or safely resumed without overwriting a version.
- S17: CI lints workflows, limits credentials/timeouts, summarizes audits, separates mobile, retains artifacts explicitly and updates dependencies through a controlled ticket/spec process. Breaking changes in 0.x bump minor; 1.0 requires an explicit release decision.

## Round 2 review scenarios

S18 happy: shared image action preserves PR loading and push tags, platforms, provenance and digest outputs. Edge: reuse existing SHA candidates.
S19 happy: workspace cache survives root policy edits; shared token edits invalidate dependents. Root ESLint changes still invalidate its actual consumer.
S20 happy: Docker tool versions follow packageManager and the resolved lockfile without build arguments.
S21 happy: optional local GitHub profile may be absent; explicit profiles work. Sad: Git errors fail closed.
S22 sad: missing QA aliases block production with the policy message before any registry mutation. Happy: shared registry lookup validates digests.
S23 happy: configuration-scoped architecture programs preserve all existing violations and run efficiently.
S24 happy: ESLint configuration declares its host dependency and aligned parser range.

Round 2 authorization: user explicitly requested these review fixes on 2026-10-03. Preserve concurrency policy; report R4 future tooling and R8 batching decisions separately.

## Vanilla React Native amendment

User selected vanilla React Native on 2026-10-04 following the mobile developer recommendation. This replaces the Expo choice within the still-open WEA-6 scaffold PR.

S25 happy: native entrypoint registers Weave and existing reusable components retain behavior.
S26 happy: Metro builds Android/iOS production JavaScript bundles with shared workspace tokens and one React installation. Sad: bundling errors fail the build.
S27 happy: committed Android/iOS projects resolve hoisted dependencies and autolink safe-area native code. Edge: native outputs/local paths are ignored; debug signing cannot masquerade as production release signing.
S28 happy: CI mobile gate requires JS bundles and both native platform compile checks; failed or skipped platform verification blocks the gate. Signed/device/store release work remains separate.
