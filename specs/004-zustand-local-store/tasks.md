# Tasks: Mobile Local State

**Input**: `specs/004-zustand-local-store/` — [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts](contracts/local-state.md), [validation guide](quickstart.md)

**Ticket / branch**: WEA-27 · `feat/WEA-27/zustand-local-store`, stacked on PR #11.

**Tests**: Mandatory by the constitution and specification. Each authored behavior requires meaningful RED → GREEN → REFACTOR evidence. Existing regression assertions may already pass; label these regression checks, never fabricated RED. Compile/import failures establish tooling problems only.

**Organization**: Shared setup/foundation, then US1 (P1), US2 (P1), US3 (P2), then delivery. Checked boxes reflect recorded implementation work; unverified checks remain open. Scenario agreement and analysis were recorded before source edits.

## Format and Path Conventions

Tasks use `- [ ] TNNN [P?] [USn?] description with repository-relative paths`. `[P]` means work on independent files after its stated prerequisites, not permission to bypass RED or run dependent mutations concurrently. New tests are adjacent to auth feature code. Evidence paths below are future outputs, not proof that commands have run.

## Phase 1: Setup

**Purpose**: Establish agreed scope, analysis and reproducible dependency adoption before behavior changes.

- [x] T001 Verify `feat/WEA-27/zustand-local-store`, the current PR #11 head and personal local identity against `specs/004-zustand-local-store/workflow.json`; preserve unrelated untracked files and record any parent drift without silently rebasing.
- [x] T002 Obtain explicit user agreement for S01–S07 and record the actual statement/date/scenario IDs in `specs/004-zustand-local-store/workflow.json`; keep scenariosConfirmed false until that agreement exists and resolve material scope questions through clarify before source edits.
- [x] T003 Run speckit-analyze on `specs/004-zustand-local-store/{spec.md,plan.md,tasks.md}`; resolve CRITICAL findings with authorized artifact edits and rerun analysis before implementation, retaining the review outcome in `specs/004-zustand-local-store/workflow.json`.
- [x] T004 Initialize truthful evidence sections for S01–S07 and task links in `specs/004-zustand-local-store/evidence.md` and update `specs/004-zustand-local-store/contracts/scenario-tests.md`; mark commands/results unrun until executed.
- [x] T005 Resolve latest stable Zustand with `pnpm --filter @weave/mobile add --save-exact zustand@latest`, update `apps/mobile/package.json` and `pnpm-lock.yaml`, record resolved version/peer compatibility in `specs/004-zustand-local-store/research.md` and `workflow.json`, run frozen install and a separate tooling import check. Stop and update design if latest changes the researched API contract.

**Gate**: T002 and T003 must pass before T005 or any source/test edits. T004 may document pending checks but cannot invent results. Analysis itself is read-only; remediation is separately authorized.

## Phase 2: Foundational State Port and Adapter

**Purpose**: Provide shared state storage with a tested contract before wiring user journeys. FR-001, FR-003, FR-005, FR-007, FR-008; basic S01/S03/S05/S06/S07 contract coverage.

- [x] T006 Declare `AuthStateReader` / `AuthStateStore` and the initial-state factory signature in `apps/mobile/src/auth/application/auth-state-store.ts`; add `AUTH_STATE_STORE` in `apps/mobile/src/auth/auth.tokens.ts` and an importable behavior-free adapter seam in `apps/mobile/src/auth/infrastructure/zustand-auth-state-store.ts`, keeping third-party types out of the application interface. Stub setup is not behavioral RED.
- [x] T007 Write and execute real-adapter contract tests in `apps/mobile/src/auth/infrastructure/zustand-auth-state-store.test.ts` before behavior implementation: quote/enforce “Every factory call returns fresh objects: session resolving, generation/revision zero; password method, idle attempt; pending false; error absent”, “getInitialState() is a stable reference to that lifetime's initial immutable snapshot”, and “getState() is reference-stable until an accepted replacement”; also test complete replacement removes obsolete optional fields, synchronous reads, identical-reference no-op, two-store isolation, unsubscribe, idempotent dispose and ignored post-disposal writes/subscriptions. Save expected behavioral failures in `specs/004-zustand-local-store/evidence/foundation-red.txt`.
- [x] T008 Implement only the tested initial-state factory and vanilla adapter in `apps/mobile/src/auth/application/auth-state-store.ts` and `apps/mobile/src/auth/infrastructure/zustand-auth-state-store.ts`; use full `setState(next, true)` replacement, owned unsubscribe cleanup and closed-write guards. Enforce “Never mutate nested values in place” and “Store contains no email form draft, password, verification code, token or raw provider object”; reuse existing AuthViewState and exported vocabularies from `apps/mobile/src/auth/domain/auth-models.ts` without changing them.
- [x] T009 Rerun T007 tests, lint and typecheck; refactor while green and record commands/results in `specs/004-zustand-local-store/evidence/foundation-green.txt` and `evidence.md`, retaining the port/adapter separation and absence of persistence/devtools/native changes.

**Checkpoint**: Shared adapter behavior is proven independently. Later story tests should exercise integration rather than re-claiming these already-green adapter behaviors as new RED.

## Phase 3: US1 — See Consistent Authentication State (P1)

**Goal**: Migrate shared authentication state without changing sign-in, errors or navigation protection. S01–S03; FR-001–FR-003; SC-001, SC-002, SC-005.

**Independent Test**: Observe two readers during all existing sign-in methods; verify rejected/duplicate operations and old callbacks cannot grant protected access.

### Tests before dependent implementation

- [x] T010 [P] [US1] Add S01–S03 controller/port integration tests in `apps/mobile/src/auth/auth-controller.test.ts` using the real adapter with injected gateway/clock fakes: coherent readers, failure/timeout states, duplicate commands and generation/revision rejection. Provide only importable interface plumbing if required; execute new behavior assertions before T012 and save real RED in `specs/004-zustand-local-store/evidence/us1-controller-red.txt`; preserve already-passing baseline checks as regression evidence.
- [x] T011 [P] [US1] Add S01/S02 rendered integration assertions in `apps/mobile/src/auth/login.test.tsx` and `apps/mobile/src/navigation/root-navigator.test.tsx`: resolving denies Home, password/email-code/Google preserve transitions, failed/duplicate submissions preserve pending/error behavior, and two consumers observe the same runtime state. Establish importable runtime/test-factory scaffolding only; capture behavioral RED before T015–T016 in `specs/004-zustand-local-store/evidence/us1-ui-red.txt`.

### Implementation and integration

- [x] T012 [US1] Inject AuthStateStore into `apps/mobile/src/auth/application/auth-controller.ts` and eliminate private mutable snapshot/listener storage; delegate compatibility getSnapshot/subscribe reads and route accepted complete snapshots through the port, rereading current state at asynchronous completions while preserving every command, timeout, generation/revision and pending guard. Run T010 to GREEN before proceeding.
- [x] T013 [US1] Update `apps/mobile/src/auth/testing/fakes.ts` and controller/consumer fixture construction to allocate fresh stores per fixture; retain assertions in existing `apps/mobile/src/auth/auth-controller.test.ts`, `auth-gateway.contract.test.ts` and other affected suites instead of deleting coverage to accommodate injection.
- [x] T014 [US1] Before runtime/provider implementation, write and execute ownership tests in `apps/mobile/src/auth/auth-runtime.test.ts` and `apps/mobile/src/auth/presentation/auth-lifecycle.test.tsx`: effect-owned allocation, no native work from abandoned renders, fresh resolving runtime per setup, construction-failure cleanup, idempotent ordered disposal, detached AppState/gateway/store listeners, and setup → cleanup → setup using a fresh usable instance. Use behavior-free importable scaffolding only; preserve existing recovery assertions with the runtime factory seam and capture behavioral RED in `specs/004-zustand-local-store/evidence/us1-lifecycle-red.txt` before T015.
- [x] T015 [US1] Compose `AuthRuntime` in `apps/mobile/src/auth/auth-runtime.ts` and wire `apps/mobile/App.tsx` plus `apps/mobile/src/auth/presentation/auth-context.tsx` using the effect-owned activation contract in `specs/004-zustand-local-store/contracts/local-state.md`: allocate/start a fresh runtime inside each effect setup, render the existing session-checking fallback until an active runtime is bound, invalidate the activation and dispose on cleanup, and never reuse a disposed runtime during replay. Keep concrete adapter construction in composition and reach GREEN on T014 before consumer integration; US2 adds repeated Reload and restart/privacy integration coverage.
- [x] T016 [US1] Implement whole-snapshot compatibility through Zustand useStore in `apps/mobile/src/auth/presentation/auth-context.tsx` and retain command-only controller access; preserve local email/password/code clearing in `apps/mobile/src/auth/presentation/use-login.ts` and current Login/Home/navigation behavior, reaching GREEN on T011 without adding new product states.
- [x] T017 [US1] Rerun focused controller, Login, Home and RootNavigator suites, refactor the controller/runtime integration while green, then run mobile lint/typecheck/test; record S01–S03 RED/GREEN/refactor and regression results in `specs/004-zustand-local-store/evidence/us1-green.txt` and `evidence.md`.

**Checkpoint**: US1 is the functional MVP: existing users can sign in safely with the new sole state authority. It can be demonstrated independently, but all remaining privacy/lifecycle requirements and delivery gates still apply before feature completion.

## Phase 4: US2 — Start Safely After Sign-Out and Recovery (P1)

**Goal**: Preserve logout/reset/privacy behavior across mounted lifetimes and process restarts. S04, S05, S07; FR-002–FR-005, FR-007; SC-001–SC-003, SC-005.

**Independent Test**: Successful/failed logout, explicit Reload and fresh process lifetime leave no stale state or protected access; native authentication resolves before Home.

### Tests before dependent implementation

- [x] T018 [P] [US2] Extend S04 tests in `apps/mobile/src/auth/home.test.tsx`: successful sign-out removes Home and resets transient state; rejection/timeout retains safe recovery; late callbacks cannot reopen protected access. Capture any new missing behavior before fixes, label unchanged parent checks as regression, and save results in `specs/004-zustand-local-store/evidence/us2-logout.txt`.
- [x] T019 [P] [US2] Extend S05 tests in `apps/mobile/src/auth/app-recovery.test.tsx` at the injected runtime/reader seam: render failure, explicit Reload, persistent failure without retry loop, fresh resolution and 20 successive resets with zero old-root effects; assert old gateway/AppState/store listeners are detached. Capture integration RED before T021–T022 in `specs/004-zustand-local-store/evidence/us2-recovery-red.txt`.
- [x] T020 [P] [US2] Extend S07 restart/privacy tests in `apps/mobile/src/auth/auth-runtime.test.ts`: dispose/recreate during pending verification and active sessions, gate Home on fresh native resolution, never hydrate prior attempts/errors, and capture snapshots excluding sentinel password/code/token/email drafts. Reuse T014-proven ownership behavior as regression coverage; save results and genuine new behavioral RED before any dependent fix in `specs/004-zustand-local-store/evidence/us2-runtime-red.txt`.

### Implementation and integration

- [x] T021 [US2] Integrate the T014-tested activation/cleanup contract with restart/privacy checks in `apps/mobile/src/auth/auth-runtime.ts` and `apps/mobile/src/auth/presentation/auth-context.tsx`; implement only new behavior proven missing by T020, keeping native authority and fresh activation instances. If no behavior is missing, record a passing regression rather than inventing RED; rerun lifecycle tests without weakening them.
- [x] T022 [US2] Complete fresh runtime creation beneath `apps/mobile/src/recovery/app-error-boundary.tsx` through `apps/mobile/App.tsx` and auth provider wiring; retain explicit Reload/persistent-error behavior and reject all old callbacks, reaching GREEN on T019. Keep logout/reset decisions in `apps/mobile/src/auth/application/auth-controller.ts`; apply only T018-proven missing behavior fixes.
- [x] T023 [US2] Recheck captured state and native-authority boundaries in `apps/mobile/src/auth/auth-runtime.test.ts` and `apps/mobile/src/auth/presentation/use-login.ts`: quote/enforce “Optional account/session/challenge identifiers are permitted ephemeral metadata only” and “Disposal does not mean logout and must not clear native secure credentials”; verify no persist/hydration/devtools imports or raw provider errors enter the adapter.
- [x] T024 [US2] Rerun logout/recovery/runtime suites and complete mobile regressions, refactor lifecycle code while green, and record S04/S05/S07 including all 20 resets in `specs/004-zustand-local-store/evidence/us2-green.txt` and `evidence.md`; explicitly distinguish fake restart checks from real process/device restoration.

**Checkpoint**: US2 can be verified independently using its injected runtime factory and gateway fixtures after shared integration. No old lifetime alters the current one and no local store restores credentials.

## Phase 5: US3 — Isolate Local State Consumers (P2)

**Goal**: Focus subscriptions and prove independent roots and unsubscribe behavior in actual React consumers. S06; FR-005, FR-006, FR-008; SC-001, SC-004.

**Independent Test**: Mount two roots and selected consumers; 100 unrelated updates cause zero selected-consumer updates; removing one consumer leaves other subscribers functional.

### Tests before dependent implementation

- [x] T025 [US3] Add selector-hook S06 tests in `apps/mobile/src/auth/presentation/auth-context.test.tsx`, using the real adapter and an importable selector seam: count store-driven committed updates after mount for 100 unrelated changes, changed selected values, two roots, consumer unmount and sibling listeners. Quote/enforce “Selected values use Object.is identity equality” and “aggregate selectors must return a stable reference or use a documented shallow helper”; capture meaningful RED before T026 in `specs/004-zustand-local-store/evidence/us3-selector-red.txt` rather than counting raw vanilla subscription callbacks.

### Implementation and integration

- [x] T026 [US3] Implement `useAuthSelector<T>` in `apps/mobile/src/auth/presentation/auth-context.tsx` using Zustand useStore and the read-only structural reader; preserve whole-state identity selection for Login and stable function identities, reaching GREEN on T025.
- [x] T027 [P] [US3] Migrate `apps/mobile/src/navigation/root-navigator.tsx` to session-status and safe-error selectors while retaining command access and protected/public route keys; verify existing `apps/mobile/src/navigation/root-navigator.test.tsx` assertions remain green.
- [x] T028 [P] [US3] Migrate `apps/mobile/src/auth/presentation/home-screen.tsx` to pending/error selectors while retaining logout command access; verify `apps/mobile/src/auth/home.test.tsx` stays green and retain existing primitives/accessibility states.
- [x] T029 [US3] Run S06 adapter/selector and all mobile regressions, refactor while green, and record isolation/unsubscribe plus the exact 100-update counter results in `specs/004-zustand-local-store/evidence/us3-green.txt` and `evidence.md`; distinguish store-driven updates from parent/development renders.

**Checkpoint**: US3 is independently testable using two real stores and selected hook consumers. It depends on US1 wiring but not US2-specific logout/recovery improvements.

## Phase 6: Polish and Cross-Cutting Delivery

**Purpose**: Complete traceability, verification, device acceptance, convergence and the requested stacked PR.

- [x] T030 Review the authored diff against `docs/standards/{architecture,typescript,react-native}.md` and the state contract; verify no React/Zustand imports enter domain/application, dependencies use interfaces/canonical factory/token, no duplicate state mirror/global store exists, and all finite runtime vocabulary uses existing exported constants; record review in `specs/004-zustand-local-store/evidence.md`.
- [x] T031 [P] Update `apps/mobile/README.md` and `specs/004-zustand-local-store/quickstart.md` for the actual resolved dependency, runtime/selector boundaries and reproducible validation commands, retaining native secure-storage ownership and parent acceptance limitations.
- [x] T032 Run `pnpm run verify`, both Metro bundles, native Android/iOS contract suites and app compile checks from `specs/004-zustand-local-store/quickstart.md`; save exact commands/results in `specs/004-zustand-local-store/evidence/verification.txt`, treating unavailable prerequisites as blockers rather than passes.
- [x] T033 Run database integration against migrated disposable local PostgreSQL as documented in `specs/004-zustand-local-store/quickstart.md` and record command, database version and actual results in `specs/004-zustand-local-store/evidence/integration.txt`; do not repurpose external databases or fabricate readiness.
- [ ] T034 Execute the exact per-scenario automated/Android/iOS matrix in `specs/004-zustand-local-store/contracts/scenario-tests.md` using the existing authorized development setup; verify session restore/process restart, provider interruption, lifecycle, accessibility and enlarged text, recording results/blockers separately from JS/native compile evidence in `specs/004-zustand-local-store/evidence/device-acceptance.md` without exposing credentials.
- [x] T035 Run speckit-converge against `specs/004-zustand-local-store/{spec.md,plan.md,tasks.md}` and actual source/tests; write `specs/004-zustand-local-store/convergence.md`, reconcile all scenario/task/test/evidence links in `contracts/scenario-tests.md`, and append genuinely remaining work rather than declaring unverified acceptance complete.
- [x] T036 Verify personal author and committer and required local checks; commit matching Conventional Commit subjects ending `[WEA-27]`, push the ticket branch, and create/attach the draft PR against PR #11's current head branch with Linear/spec/evidence/convergence links; record URL and actual CI/review state in `specs/004-zustand-local-store/workflow.json`, retaining the retarget-to-develop dependency and no implicit merge/protection bypass.

## Dependencies and Execution Order

```text
T001 → T002 + T003 → T004 → T005
T005 → T006 → T007 RED → T008 GREEN → T009
Foundation → US1 tests T010 || T011 → T012 → T013 → T014 RED → T015 GREEN → T016 → T017
US1 → US2 tests T018 || T019 || T020 → T021 → T022 → T023 → T024
US1 → US3 T025 RED → T026 GREEN → T027 || T028 → T029
US1 + US2 + US3 → T030 → T031 → T032 → T033 → T034 → T035 → T036
```

T003 can run while scenario agreement is pending, but implementation cannot. Within each phase, tests precede dependent implementation; task-level evidence records actual chronology. `[P]` tests touch separate files and can be authored/executed together after foundation; evidence outputs are separate. Fixture mutations and shared provider/controller edits are sequential. US2 and US3 integration are sequential in the default implementation order because both touch auth-context.tsx; do not run those edits concurrently.

## Parallel Examples by Story

- **US1**: T010 controller tests and T011 Login/navigation tests use different files and separate logs after T009. Keep T012–T016 ordered; T014 ownership tests must fail behaviorally before T015 runtime implementation.
- **US2**: T018 logout, T019 recovery and T020 restart/privacy tests use separate files/logs after T017. Keep T021–T024 ordered to avoid shared runtime edits.
- **US3**: After T026, T027 navigation and T028 Home migrations can proceed together on different files, then converge in T029. T025 precedes selector implementation.
- **Cross-cutting**: T031 docs may run alongside T030 code review after stories finish. The graph shows a safe serial default; no parallel-agent work is required.

## Requirement Coverage

| Requirement / outcome                      | Tasks                                 |
| ------------------------------------------ | ------------------------------------- |
| FR-001 coherent shared state               | T007–T017                             |
| FR-002 auth/navigation/lifecycle preserved | T010–T024, T032, T034                 |
| FR-003 stale/disposed rejection            | T007–T012, T014–T015, T019–T024       |
| FR-004 sign-out cleanup/failure            | T018, T022–T024                       |
| FR-005 fresh root/subscription cleanup     | T007–T009, T014–T015, T019–T025, T029 |
| FR-006 focused subscribers                 | T025–T029                             |
| FR-007 memory-only/no credentials          | T008, T020–T024, T030, T034           |
| FR-008 isolated instances                  | T007–T009, T014–T015, T020, T025–T029 |
| SC-001 seven scenarios/platforms           | T010–T029, T032, T034–T035            |
| SC-002 protected access                    | T011, T016–T019, T022, T032, T034     |
| SC-003 20 root resets                      | T019, T022, T024                      |
| SC-004 100 unrelated changes               | T025–T029                             |
| SC-005 mobile regressions                  | T009, T013, T017, T024, T029, T032    |

## Implementation Strategy

1. Complete agreement/analysis/setup and foundation before any story implementation.
2. Deliver US1 as the first demonstrable increment: unchanged auth journeys using one Zustand-backed snapshot authority.
3. Add US2 lifecycle/privacy assurance, then US3 selected subscriptions; validate each independently and keep earlier regressions green.
4. Complete full verification, device evidence and convergence before reporting the feature implemented. Publication depends on parent PR status and required checks/review; no deployment is included.

## Notes

Retain existing domain field contracts: session status/generation/revision with optional validatedAt/sessionId/accountId/safe error; attempt method/stage with optional attemptId/codePurpose/retryAfterSeconds; allowlisted safe errors only. No new field limits or schema are introduced. Task evidence must preserve optional-field removal, immutable references and allowed ephemeral identifiers exactly as data-model.md defines them. If testing reveals a new behavioral requirement, update and agree scenarios before its implementation. Blocked checks remain open tasks.

## Phase 7: Convergence

- [ ] T037 Complete the outstanding Android/iOS live-provider, restart, interruption, screen-reader and enlarged-text journeys in `specs/004-zustand-local-store/contracts/scenario-tests.md`, record actual evidence in `specs/004-zustand-local-store/evidence/device-acceptance.md`, and close T034 only after both platforms are verified per SC-001 (partial, HIGH). Automated/native evidence does not waive this acceptance.
