# Tasks: Change npm to pnpm [WEA-8]

## Phase 1: Setup

- [x] T001 Record approved S01-S06, public seams and WEA-8 scope in specs/002-change-npm-to-pnpm/spec.md and workflow.json.
- [x] T002 Research pinned tool behavior and read scoped rules in specs/002-change-npm-to-pnpm/research.md.

## Phase 2: Foundational

- [x] T003 Analyze spec/plan/task consistency and confirm quality checklist in specs/002-change-npm-to-pnpm/checklists/requirements.md.

## Phase 3: US1 reproducible workspace

- [x] T004 [US1] Migrate package.json, apps/_/package.json and packages/_/package.json to pnpm scripts/workspace contracts; add pnpm-workspace.yaml; import pnpm-lock.yaml and update turbo.json (FR-001/002; S01).
- [x] T005 [US1] Validate fresh/frozen install and stale fixture rejection; record results in specs/002-change-npm-to-pnpm/evidence.md (S01/S03; FR-001/003).

## Phase 4: US3 maintenance enforcement

- [x] T006 [US3] Add one regression at validateDependencyProposal in tests/policy/dependency.test.mjs; record expected pnpm-lock.yaml rejection RED (S06; FR-006).
- [x] T007 [US3] Accept pnpm-lock.yaml in scripts/dependency-policy.mjs, preserve rejection boundaries, run GREEN; convert adoption/hook commands in scripts/ and .githooks/ (S06; FR-002/006).
- [x] T008 [US3] Convert .github/actions/setup/action.yml and .github/workflows/ci.yml to frozen pnpm/cache/audit and run workflow/audit validation (S03/S06; FR-003).

## Phase 5: US2 delivery targets

- [x] T009 [US2] Convert apps/api/Dockerfile and apps/web/Dockerfile; test pruning, frozen installs, builds and runtime health (S04; FR-004).
- [x] T010 [US2] Validate Metro and available native checks through apps/mobile/package.json commands; record unavailable prerequisites (S05; FR-005).

## Phase 6: Polish and verification

- [x] T011 Update README.md, apps/mobile/README.md, docs/standards/ and AGENTS.md active guidance; retain history and add docs/decisions/0002-pnpm-workspace.md (FR-007).
- [x] T012 Run pnpm run verify and database integration; record S02 and all scenario evidence in specs/002-change-npm-to-pnpm/evidence.md.
- [x] T013 Review against develop and specs/002-change-npm-to-pnpm/spec.md on standards/spec axes; address findings and run converge in specs/002-change-npm-to-pnpm/convergence.md.
- [x] T014 Verify personal author/committer and commit WEA-8 changes on the ticket branch.

## Dependencies and execution

Setup → foundational → US1 → US3 → US2 → final validation/review. US1 is the minimum usable migration; complete all stories for this ticket. Independent API/web checks may run concurrently after the shared lock/configuration is stable. No source edits run concurrently. Each behavior slice uses RED then GREEN before moving to the next; configuration-only edits use real CLI checks rather than tautological text assertions.

## Phase 7: Convergence

- [x] T015 Validate both Linux images with tests/containers/runtime.test.mjs on working container infrastructure before marking the PR ready; record the result in specs/002-change-npm-to-pnpm/evidence.md per S04/FR-004.

## Phase 8: PR review remediation

- [x] T016 Reconcile CI run 37220538960 with T009/T015, evidence, convergence and PR readiness per S04/S05/FR-004/005.
- [x] T017 Run only Docker prune stages on BUILDPLATFORM; preserve target-platform dependency installation and runtime packaging per S04/FR-004.
- [x] T018 Clarify and document the package-age policy, verify pinned pnpm frozen/resolution behavior, and qualify Dependabot support per S01/S03/S06/FR-001/003/006.
- [x] T019 Derive active bootstrap commands from packageManager, correct Metro resolution docs, and sanitize WEA-8 evidence path prefixes per FR-007.
- [x] T020 Run verification/database integration and record convergence per S02/SC-002/004.

Post-merge operational handoff: close obsolete npm-lockfile Dependabot PRs #2–#6, request a fresh update check and verify its generated pnpm lockfile and CI. Do not close them before the new lockfile is on develop. Dependency adoption still requires a fresh ticket/spec branch. The existing develop candidate-image digest failure requires separate ticket scope.
