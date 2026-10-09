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

## Phase 6: Motion refinement preview

- [x] T012 [US1] Record confirmed S06–S08, source inspection and public frame/preview seams in `spec.md`, `plan.md` and `workflow.json`; verify Blender availability.
- [x] T013 [US1] Reproduce the late shadow/handoff discontinuity with a frame-sequence check and record baseline RED under `evidence/motion-refinement/` before changing animation source.
- [x] T014 [US1] Author a separately versioned preview and exportable geometry in the visualization workspace for S06/S07; inspect structured Blender state and rendered frames, preserving the approved final image.
- [x] T015 [US1] Rerun frame checks, inspect normal/slow playback and reference alignment, document actual results and remaining limits in `evidence.md`, and present the preview without changing v1 application assets (S08).

Dependencies: T012 → T013 → T014 → T015. This revision has no parallel implementation work. A production media replacement is a subsequent reviewed integration slice.

## Phase 7: Approved v2 integration and publication

- [x] T016 Record user acceptance of S06–S08 and requested publication; map the reviewed export to the existing AuthShell media seam before production changes.
- [x] T017 Update the S01 public playback contract to request v2 and capture behavioral RED against v1, then copy the approved export and switch the source; run GREEN for S01–S04/S08.
- [x] T018 Package reproducible v2 design sources and licenses, document asset provenance and actual frame evidence, and verify no new runtime dependency or CSS.
- [x] T019 Run required repository verification and database integration, inspect the production page, and record convergence with unresolved T009 checks.
- [x] T020 Verify personal author/committer, commit and push through normal hooks, and update existing PR #10 into develop with spec/evidence links and actual check status.

Dependencies: T016 → T017 → T018 → T019 → T020. This slice reuses the approved preview; no new visual direction is introduced.

## Phase 8: Production layout regression

- [x] T021 Record the S04 classic-scrollbar boundary and actual browser RED before changing layout: same 1280 × 720 viewport, artwork x shifts 238 → 232.75 during authentication readiness.
- [x] T022 Reserve scrollbar space only on authentication pages; capture identical artwork bounds before/after readiness, retain normal form scrolling and rerun required checks.

Dependency update: T021 → T022 precede completion of T019 and publication T020. The existing S04/SC-002 approval covers this stability correction.

## Phase 9: Convergence

- [ ] T023 Verify authentication-only scrollbar reservation with classic and overlay scrollbars in the target Safari/Firefox/mobile matrix per S04/SC-002 and plan: production layout regression (partial, MEDIUM). Chromium at 1280 × 720 passes; record other actual observations alongside T009 before marking the PR ready.
