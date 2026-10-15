# Scenario to Test Mapping

WEA-27 · Proposed coverage; no behavioral evidence claimed. Each row must receive actual failing command/output, minimal implementation, passing command/output and refactor evidence during implementation. Missing dependencies/imports are setup failures, not RED.

| Scenario | Requirement            | Public test seam and assertions                                                                                                                                                                 | Target suite                                                                               |
| -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| S01      | FR-001, FR-002         | Real runtime + gateway fake; two readers observe same accepted snapshot; resolving never shows Home; all three existing auth methods preserve transitions                                       | auth-controller.test.ts, login.test.tsx, home.test.tsx, navigation/root-navigator.test.tsx |
| S02      | FR-002                 | Command interface and UI; invalid input, invalid credentials, rejected promise/offline, timeout and repeated submit yield safe errors, stop pending, deny Home, invoke only one operation       | auth-controller.test.ts, login.test.tsx                                                    |
| S03      | FR-003                 | Deferred gateway responses and fake clock; old generation, lower/out-of-order revision, replaced attempt and disposed root cannot publish                                                       | auth-controller.test.ts, app-recovery.test.tsx                                             |
| S04      | FR-002, FR-004         | Successful signOut clears transient state/routes; failure preserves safe existing unavailable/error behavior; late session event cannot reopen Home                                             | home.test.tsx, navigation/root-navigator.test.tsx                                          |
| S05      | FR-003, FR-005         | Error boundary + injected runtime factory; render fault, explicit Reload, new resolving state, fresh native resolution, old callbacks/subscribers inactive; repeat 20 times                     | app-recovery.test.tsx, runtime lifecycle tests                                             |
| S06      | FR-005, FR-006, FR-008 | Two real adapter instances; idempotent unsubscribe/dispose; replaced optional error removed; getState reference stability; selected reader/hook counters unchanged across 100 unrelated updates | new state adapter contract and auth-context selector tests                                 |
| S07      | FR-002, FR-007         | Dispose and recreate runtime with gateway fake; no hydration; selected captured snapshots never contain sentinel password/code/token/form draft; resolving precedes native restore              | new runtime tests plus app-recovery.test.tsx                                               |

## Both-platform acceptance

Run the same Login → Home → logout, validation/network recovery, foreground/background, provider interruption and explicit Reload journeys on Android and iOS. Restart the process during pending verification and while authenticated; ensure no old attempt is restored and native session validation gates Home. Preserve screen-reader labels/focus, pending controls and enlarged-text layouts. Use the parent's configured development environment and owner-controlled test accounts; missing live prerequisites stay unverified.

JS fake/selector checks establish deterministic state ownership, not real secure-storage durability or device correctness. Existing native suites and device journeys supplement them. Parent WEA-10 gaps remain attributed to WEA-10, and any newly discovered behavior changes re-enter scenario agreement.

## Evidence sequencing

1. Confirm scenarios in workflow.json and map task IDs after tasks generation.
2. Verify tooling can import the dependency; write behavior tests before implementation.
3. Save scenario-specific expected RED, GREEN and refactor outputs under this feature's evidence directory.
4. Run existing regression suites after each slice. Retain tests' observable assertions when factory signatures change.
5. Capture final verification/integration/native/device outcomes and final convergence, including blockers.

## Generated Task Traceability

| Scenario | Task IDs                               | Coverage role                                                    |
| -------- | -------------------------------------- | ---------------------------------------------------------------- |
| S01      | T007–T017, T032, T034                  | Coherent snapshot, existing methods and route protection         |
| S02      | T010–T017, T032, T034                  | Errors, timeouts and duplicate submissions                       |
| S03      | T007–T012, T014–T015, T019–T024, T034  | Stale generation/revision and disposed-root effects              |
| S04      | T018, T022–T024, T032, T034            | Logout success/failure and protected route removal               |
| S05      | T007–T009, T014–T015, T019–T024, T034  | Fresh runtime, cleanup and 20 root resets                        |
| S06      | T007–T009, T025–T029                   | Instance isolation, selected consumers and 100 unrelated changes |
| S07      | T008, T014–T015, T020–T024, T030, T034 | No local credential persistence; restart native authority        |

Task generation establishes planned coverage only. Actual test names, commands/results and evidence links must be filled during implementation. Shared gates T001–T005 and final convergence/publication T035–T036 apply to every scenario.

## Scenario Validation Applicability

This matrix defines required coverage. Shared deterministic checks run once with the real JS store and fake gateway/clock; they are not repeated as independent device tests. A missing platform prerequisite remains unverified, never a waiver.

| Scenario | Shared automated checks                                                                             | Android journey                                                                                | iOS journey                                                                                |
| -------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| S01      | Controller/reader coherence and navigation across all three methods                                 | Resolve session; password, email-code and Google → Home                                        | Same journey                                                                               |
| S02      | Invalid input/credentials, offline/rejection, timeout, duplicate operation counts                   | Invalid credentials, offline recovery and repeated submit; no protected access                 | Same journey                                                                               |
| S03      | Controlled old generation/revision, replaced attempt and disposed-root callbacks                    | Interrupt/replace a sign-in and background/foreground; no stale protected access               | Same journey                                                                               |
| S04      | Successful/failed sign-out state, pending/error and late callbacks                                  | Logout removes Home; failed sign-out recovers safely                                           | Same journey                                                                               |
| S05      | Render fault, cleanup, replay, persistent error and 20 successive root resets with zero old effects | Explicit Reload returns to fresh session validation                                            | Same journey                                                                               |
| S06      | Two real stores, unsubscribe/unmount, selected-consumer counters across 100 unrelated changes       | No separate user journey: internal subscription contract; Android bundle/native build required | No separate user journey: internal subscription contract; iOS bundle/native build required |
| S07      | Fresh activation/restart fixtures, snapshot privacy and no hydration                                | Terminate/restart during verification and active session; native validation gates Home         | Same journey                                                                               |

Exact stale-callback injection/counting is automated; S03 device interruption validates integration without claiming timing control over the provider. The 20-reset and 100-update thresholds are deterministic automated checks. Screen-reader/enlarged-text acceptance accompanies the visible S01/S02/S04/S05 journeys on both platforms. Native compile success cannot substitute for these journeys.

## Actual Evidence

S01–S07 automated evidence and the precise RED/GREEN/refactor sequence are recorded in [evidence.md](../evidence.md). Actual test seams: `zustand-auth-state-store.test.ts` (S01/S06), `auth-controller.test.ts` (S01/S02/S03), `auth-runtime.test.ts` (S01/S05/S07), `auth-lifecycle.test.tsx` (S05), `app-recovery.test.tsx` (S03/S05/S07), `auth-context.test.tsx` (S06), plus preserved Login/Home/navigation regression suites (S01/S02/S04). T034/T037 retain the live Android/iOS acceptance gap.
