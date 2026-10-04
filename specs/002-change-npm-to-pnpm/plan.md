# Implementation Plan: Change npm to pnpm

**Branch**: `feat/WEA-8/change-npm-to-pnpm` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

## Summary

Import the npm dependency graph into a pinned pnpm 11.1.1 workspace. Preserve the hoisted layout required by native paths. Move React overrides into pnpm-workspace.yaml, use workspace:* for internal contracts, and explicitly approve only required dependency build scripts. Convert commands, frozen CI installs/cache/audit, hooks, Docker pruning and current docs. Keep historical evidence untouched.

## Technical Context

Language: TypeScript 6.0.3, Node 24, shell/YAML/ESM tooling.
Dependencies: Turbo 2.11.7 (exact existing lock), pnpm 11.1.1, Next/Nest/React Native/Prisma versions imported from existing lockfile.
Storage: shared pnpm-lock.yaml; PostgreSQL integration unchanged.
Testing: Node public policy interfaces/CLI, pnpm frozen install, existing application suites, Metro/native commands, Docker runtime-health tests.
Platforms: macOS developer host; Linux containers/CI; Android/iOS native jobs.
Performance: No new benchmark requirement; preserve reusable install/Turbo layers.
Constraints: No upgrades, security gate removal, deployment or unrelated refactoring.
Scope: root plus six workspace packages; two Dockerfiles and existing CI/hooks.

## Constitution Check

Passed before and after design: dedicated WEA-8 branch/spec; confirmed S01-S06 and public seams; meaningful RED/GREEN for authored proposal-policy behavior, real command validation for declarative migration; no app/domain architecture changes; existing native integration conventions retained; personal identity supplied by user; no publishing. Final verification and convergence required. There are no extension hooks registered.

## Project Structure

- package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json: authoritative workspace/toolchain/cache.
- apps/_/package.json, packages/_/package.json: explicit internal dependencies.
- apps/api/Dockerfile and apps/web/Dockerfile: frozen pruned installation; locked Turbo invoked locally; production API reinstall after build; Next standalone output retained.
- .github/actions/setup/action.yml, .github/workflows/ci.yml: bootstrap exact validated pnpm, cache its store, frozen install, convert invocations and audit.
- scripts/dependency-policy.mjs, scripts/adopt-dependency-update.mjs, scripts/agent-hooks.mjs, .githooks/*: migrate public maintenance contract.
- tests/policy/dependency.test.mjs: proposal acceptance and rejection at exported validator seam.
- README.md, apps/mobile/README.md, docs/standards/*, AGENTS.md: active instructions; preserve ADR/history with a new migration decision.
- specs/002-change-npm-to-pnpm/: specification, research, quickstart, data model, tasks, workflow, evidence and convergence.

## Validation Strategy

Implement vertical slices. First prove pnpm lockfile adoption rejected at the existing public validator (RED), enable only that format (GREEN), retain rejection tests. Declarative package-manager changes use real install/CLI checks: fresh frozen installation; temporary stale-manifest fixture rejected without lockfile mutation; workspace links/React alignment; pruned frozen installs; verify, database integration and Docker runtime tests. Native checks run where prerequisites exist; missing SDKs are recorded and CI jobs remain required. Audit summary consumes real pnpm report and error/critical fixtures without weakening failure behavior.

## Implementation Order

Workspace/configuration → maintenance policy → CI/hooks/docs/containers → verification → two-axis code review → converge → commit. Sequential execution in the current clean ticket checkout, as the user requested implement here.
