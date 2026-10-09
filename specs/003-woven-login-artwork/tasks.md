# Tasks: Woven login artwork

Input: [spec.md](spec.md), [plan.md](plan.md). Ticket: WEA-24.
The ordered transfer preserves original TDD history and adds a regression check against current develop. Tests are mandatory under the constitution.

## Phase 1: Scope and traceability

- [x] T001 Record approved S01–S04 scenarios, public test seams and historical mapping in `spec.md`, `plan.md` and `workflow.json` before source transfer.
- [x] T002 Create the dedicated ticket branch from develop and analyze requirements/tasks for coverage and constitution conflicts.

## Phase 2: US1/US2 tests before source transfer

- [x] T003 Transfer `apps/web/test/auth-artwork.test.tsx`, `auth-motion.test.tsx`, `dom.ts` and `css-modules.ts`; relabel artwork scenarios WEA-24 S01–S04 and capture meaningful failure against the bag.
- [x] T004 Transfer approved component/hook/CSS, shell/view integration and versioned media for FR-001–FR-005; demonstrate GREEN and run web regression tests.
- [x] T005 Review stable shell mounting, small presentation files, terminal fallback, unchanged auth contracts and removal of obsolete global bag CSS.

## Phase 3: Verification and review preparation

- [x] T006 Preserve original RED/GREEN, browser/color/layout and screenshot evidence with provenance; migrate documentation and source archive into `docs/design/`.
- [x] T007 Run `npm run verify` and database integration on WEA-24; inspect scope, asset hashes and author/committer identity.
- [x] T008 Assess convergence, record remaining checks and prepare the requested branch and PR into develop with specification/evidence links.

## Dependencies

T001–T002 precede tests; T003 precedes T004; T004 precedes T005–T007; T008 follows verification. S01 and S02/S03 share the lifecycle and transfer as one tested slice. S04 combines public interaction tests and actual browser geometry evidence. No parallel implementation is necessary.

## Phase 4: Convergence

- [ ] T009 Complete browser visual verification for S01/S03/S04 and plan: browser evidence (partial, MEDIUM): Safari/Firefox codec, color and handoff; real mobile/reduced-motion/no-JavaScript rendering; throttled-media behavior. Record actual observations before marking the PR ready. DOM lifecycle tests and the historical Chromium inspection do not replace this matrix.

## Phase 5: Publication gate correction

- [x] T010 Record S05 and the existing policy test failures from the normal push hook in `evidence/push-hook-red.txt`; identify inherited Git environment as the cause before changing the fixture.
- [x] T011 Isolate temporary-repository setup in `tests/policy/git-config.test.mjs`; rerun under inherited Git context, verify parent identity unchanged, and rerun required publication checks without bypassing hooks.
