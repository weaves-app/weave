# Android permission adapter — T014 and Android T016

Executed 2026-10-17 UTC on `feat/WEA-29/onesignal-push`, based on
`75814ad85894460ddeae46c9aa337f0d09463f5c`. Scenarios: S01–S02.

## Public seam and covered behavior

`NotificationPermissionAdapter` consumes the interface
`AndroidNotificationPermissionPlatform`. Its native snapshot supplies API level,
OS/SDK notification enablement, requestability, native request history,
restriction and availability. No request-history value comes from JS state.

Tests invoke the real adapter with controlled native-operation completion:

- Observation remains silent and reflects permission changes on settings return.
- Android API 33+ normalizes undetermined, allowed, denied, restricted and
  unavailable states with accurate requestability; API 32 reflects enabled or
  denied settings without inventing a runtime permission prompt.
- Only explicit `enable()` requests permission; concurrent calls coalesce and
  explicitly disable SDK settings fallback. Allowed, nonrequestable, restricted
  and unavailable states do not request permission.
- Denial/dismissal use the resulting native observation and never automatically
  open settings. Explicit settings operations coalesce while pending.
- Platform request/settings failures are sanitized; a later explicit Enable can
  retry. Native observation errors return unavailable without escaping private
  SDK diagnostics.

## Actual RED → GREEN → REFACTOR chronology

The initial production file contained only contracts and a fail-closed public
placeholder: observation/enable returned unavailable, settings returned false.
It compiled before behavior was implemented. A permission fixture held native
operations with `CompletableDeferred`, allowing double-tap assertions while work
was still pending.

| Stage                                | Exact command                                                                                                                             | Actual result                                                                                                                                            | Evidence                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Initial RED                          | From `apps/mobile/android`: `./gradlew :app:testDebugUnitTest --tests 'si.tryweave.notifications.NotificationPermissionTest' --no-daemon` | Exit 1; 9 executed, 8 failed on expected permission/dispatch assertions. Unavailable-state case already passed the placeholder and is baseline coverage. | [Log](logs/android-permission-red.txt), [assertions](logs/android-permission-red-results.json)                         |
| Minimum GREEN                        | Same targeted command                                                                                                                     | Exit 0; 9 tests, zero failures/errors/skips. XML timestamp 04:26:35 UTC.                                                                                 | [Log](logs/android-permission-green.txt), [result](logs/android-permission-green-results.json)                         |
| Observation-error RED                | Same targeted command after adding error case                                                                                             | Exit 1; 10 executed, exactly 1 failed: `Native observation failures must return sanitized state`.                                                        | [Log](logs/android-permission-observation-red.txt), [assertions](logs/android-permission-observation-red-results.json) |
| Observation fix and regression GREEN | From repository root: `pnpm --filter @weave/mobile run test:native:android`                                                               | Exit 0; 40 tests: 10 permission + 30 existing auth/Clerk; no failures/errors/skips. 23 s.                                                                | [Log](logs/android-permission-final.txt), [suites](logs/android-permission-final-results.json)                         |
| REFACTOR                             | Same full native command after sharing the immutable unavailable observation                                                              | Exit 0; same 40 tests; no failures/errors/skips. 10 s.                                                                                                   | [Log](logs/android-permission-refactor.txt), [suites](logs/android-permission-refactor-results.json)                   |

Gradle runs used the approved existing tool/cache access. Initial foundation
tooling/lock failures are recorded separately and are not counted as RED here.
`git diff --check -- apps/mobile/android` also passed.

## Boundaries still open

This slice implements the injected permission/settings adapter only. The real
SDK/OS facade, notification TurboModule and account/root coordinator are later
integration work. Explicit opt-in/account eligibility is not performed by this
adapter. Coalescing covers overlapping pending operations; the composition/OS
facade must define completion using the real permission/settings lifecycle.
No provider initialization, real permission dialog/settings round trip, delivery,
account binding, APK assembly or device acceptance is claimed. T043 still owns
actual Android versions with and without runtime permission prompts. Existing
upstream Gradle/JVM deprecation warnings remain.
