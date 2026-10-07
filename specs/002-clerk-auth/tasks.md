# Tasks: WEA-10 Next.js (Vishnuu)

## Phase 1: Setup

- [x] T001 Record web-only scenario agreement and ownership in specs/002-clerk-auth/workflow.json.
- [x] T002 Research compatible SDK and runtime configuration in specs/002-clerk-auth/research.md (FR-006/S09 web).
- [x] T003 Add locked web SDK/testing dependencies in apps/web/package.json and package-lock.json.

## Phase 2: Foundations

- [x] T004 Write and run meaningful entry/access policy RED in apps/web/test/auth-policy.test.ts (FR-002/003/004/S02/S03/S07/S08 web).
- [x] T005 Implement entry/access policy GREEN and refactor in apps/web/src/features/auth/application/policy.ts; record specs/002-clerk-auth/evidence.md.

## Phase 3: US1 Public registration (P1)

Independent check: unverified signup cannot activate; correct code activates, wrong code recovers.

- [x] T006 [US1] Write registration, verification and recovery RED in apps/web/test/auth-flow.test.ts (FR-001/005/S01/S08 web).
- [x] T007 [US1] Implement minimum gateway-driven signup/verification GREEN then refactor in apps/web/src/features/auth/application/flow.ts; record specs/002-clerk-auth/evidence.md.

## Phase 4: US2 Login and lifecycle (P1)

Independent check: login completion activates, Device Trust code supported, restored verification continues, cancellation/repeats cannot navigate, signout clears session.

- [x] T008 [US2] Add login/session/late-result/repeat/signout RED in apps/web/test/auth-flow.test.ts (FR-002/004/005/S02/S07/S08 web).
- [x] T009 [US2] Implement lifecycle GREEN and refactor in apps/web/src/features/auth/application/flow.ts; record specs/002-clerk-auth/evidence.md.

## Phase 5: US3 Application invitation (P1)

Independent check: invitation submission has ticket/password only; invalid provider ticket never falls back; signed-in/malformed entry denied.

- [x] T010 [US3] Add recipient-bound invitation and provider failure RED in apps/web/test/auth-flow.test.ts (FR-003/005/S03/S08 web).
- [x] T011 [US3] Implement invitation GREEN and refactor in apps/web/src/features/auth/application/flow.ts; record specs/002-clerk-auth/evidence.md.

## Phase 6: US4 UI, provider integration and delivery (P1)

Independent check: labelled forms reflect verification/loading/retry, Home waits for auth, signout recovers failures, server policy denies direct access.

- [x] T012 [US4] Add UI behavior RED in apps/web/test/auth-ui.test.tsx (FR-001/002/003/004/005/S01/S02/S03/S07/S08 web).
- [x] T013 [US4] Implement forms/Home/signout GREEN then refactor in apps/web/src/features/auth/presentation/; record specs/002-clerk-auth/evidence.md.
- [x] T014 [US4] Test SDK adapter calls and server boundary behavior in apps/web/test/auth-adapter.test.ts and apps/web/test/auth-server.test.ts, then implement apps/web/src/features/auth/infrastructure/ and wire apps/web/src/app/ and apps/web/src/proxy.ts (FR-001–006/S01–S03/S07–S09 web).
- [x] T015 [US4] Run web lint/typecheck/test/build, npm run verify and database integration; record actual outcomes in specs/002-clerk-auth/evidence.md (FR-007/S10 web).
- [x] T016 [US4] Perform authorized live web flows and same-environment identity checks or document precise blockers in specs/002-clerk-auth/evidence.md (FR-006/007/S09/S10).

## Phase 7: Polish and convergence

- [x] T017 Update web environment example and guide in apps/web/.env.example and specs/002-clerk-auth/quickstart.md.
- [x] T018 Assess implementation and append remaining work under convergence in specs/002-clerk-auth/tasks.md; record specs/002-clerk-auth/convergence.md.

## Dependencies and execution

T001–T003 → T004–T005 → US1 → US2 → US3 → UI/adapters → verification → convergence. Every test task precedes dependent behavior; relevant scenarios run after each slice. Shared coordinator files make implementation sequential. Independent read-only SDK research can run alongside local inspection (completed). US1 is the first demonstrable slice; no deployment is authorized. Native FR/SC portions and S04–S06 remain Pravin's responsibility, explicitly outside every task here. Overall WEA-10 remains incomplete until native and joint S09/S10 evidence exists.

## Phase 8: Convergence

- [ ] T019 Verify real Clerk web signup/verification, login/Device Trust, invitation valid/expired/reused/different identity, browser reload/expiry/signout and offline/cancellation using owner-supplied authorized keys/test fixtures; save actual results in specs/002-clerk-auth/evidence.md per FR-001–005/FR-007 and S01–S03/S07/S08/S10 (partial; HIGH, blocked on prerequisites).
- [ ] T020 Obtain Pravin's independently verified native scenario evidence and confirm one environment's application/account across web/native in specs/002-clerk-auth/evidence.md per FR-006 and S09, SC-001/004 (partial; HIGH, delegated native scope).
- [ ] T021 Run required remote CI and obtain code-owner review after separately authorized publication; link checks in specs/002-clerk-auth/evidence.md per Constitution 9/10 and FR-007/S10 (missing; MEDIUM, no publication authorized).

## Phase 9: Approved web design revision

- [x] T022 Record explicit S11 agreement; design S12 is already approved. Analyze revised spec/plan/task consistency before source edits.
- [x] T023 Write and run meaningful RED for branded auth interactions, Google initiation/retry/repeat guards and callback protection; record evidence (S11/S12).
- [x] T024 Implement minimum GREEN for approved shell, semantic tokens, local Figtree/OFL, logo/favicon/bag, signup/signin/verification and honest configuration state. Remove invitation screen from active web routing (S01/S02/S08/S12).
- [x] T025 Implement interface-driven Clerk Google flow and callback GREEN; refactor while relevant scenarios remain green (S11).
- [x] T026 Run affected scenarios after each edit, then repository verification/database integration; update evidence and convergence without reusing prior passing results for new code (S10).
- [ ] T027 With owner-provided configuration, verify new signup → verification → Home → signout → same-account signin → Home and Google flow in a system browser; save actual screenshots/results or exact blockers (S01/S02/S11).

Revision supersedes invitation checks in T019 for current web scope. Prior checked invitation tasks record historical implementation only. Required remote CI/code-owner review T021 and Pravin’s native/joint evidence T020 remain mandatory before overall completion.

## Phase 10: Convergence

- [ ] T028 Verify authorized live Clerk email signup/verification, Google signup/signin/cancellation and same-account re-login in a system browser; save real provider results/screenshots per FR-001/002/008, S01/S02/S11 and SC-001 (partial, HIGH; owner configuration missing; follows T027).
- [ ] T029 Obtain Pravin’s independent native and joint same-environment evidence per FR-006/S09 and SC-004 (partial, HIGH; native outside this session; follows T020).
- [ ] T030 Run mandatory remote CI and code-owner review after separately authorized publication per FR-007/S10 and Constitution 9/10 (missing, MEDIUM; follows T021).

## Live-flow regressions (S08/S11 already confirmed)

- [x] T031 Reproduce error loss during SDK updates with meaningful RED, retain form state, run relevant scenarios and save GREEN.
- [x] T032 Reproduce callback incomplete/error outcomes with meaningful RED, handle actual requirements/failure/timeout without granting access, run relevant scenarios and save GREEN.
- [ ] T033 Run final verification/integration and repeat owner-assisted live acceptance; record limits and mandatory CI status.

## Phase 11: Convergence

- [ ] T034 After owner sets the development Clerk app to Membership optional, verify real Google signup/signin → Home plus email signup → code verification → Home → signout → same-account signin; record real acceptance and failure cases (FR-001/002/005/008, S01/S02/S08/S11, SC-001; HIGH, partial; follows T027/T028/T033).
- [ ] T035 Obtain native/joint same-environment evidence from Pravin (FR-006, S09, SC-004; HIGH, partial; follows T029).
- [ ] T036 Run required remote CI/code-owner review after authorized publication (FR-007, S10, Constitution 9/10; MEDIUM, missing; follows T030).

## Phase 12: Approved organization onboarding revision

This revision supersedes the Membership optional prerequisite in T034.

- [x] T037 Record explicit S13–S15 confirmation and analyze revised spec/plan/task coverage before source changes.
- [x] T038 Write meaningful organization destination/server access RED, implement GREEN and refactor (S13/S15, FR-010/011).
- [x] T039 Write organization list/create/accept/activate/retry/concurrency RED, implement consumer-owned gateway/controller GREEN and refactor (S13–S15).
- [x] T040 Write approved accessible picker/create/empty/error UI RED, compose real Clerk adapters and routes, implement GREEN (S13–S15).
- [ ] T041 Run relevant scenarios after edits, full verification/database integration and authorized live acceptance; record actual limits and convergence (S10/SC-005). Required remote CI/code-owner review remains T036.

## Phase 13: Convergence

- [ ] T042 Complete owner-assisted live Clerk Google/email authentication → organization picker → create/activate → Home → signout → same-account signin, existing memberships and authorized pending invitation acceptance/retry checks; record actual outcomes/screenshots (FR-010/011, S13–S15, SC-005; partial, HIGH). Local mocked scenarios and signed-out gate are complete; authenticated provider acceptance remains pending.
- [ ] T043 Run required remote CI and obtain code-owner review after authorized publication (FR-007, S10, Constitution 9/10; missing, MEDIUM; follows T036). Native/joint acceptance stays with Pravin and T035.
