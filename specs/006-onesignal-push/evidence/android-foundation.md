# Android foundation verification — T008

Run on 2026-10-17 UTC, branch `feat/WEA-29/onesignal-push`, base
`75814ad85894460ddeae46c9aa337f0d09463f5c`. This is harness/compile evidence,
not behavioral RED or device/provider acceptance.

## Results

- `SessionAuthorizedTransport.kt` compiles in `:app:compileDebugKotlin`.
- `NotificationFakes.kt` compiles in `:app:compileDebugUnitTestKotlin`.
- Default Android test discovery includes notification-package tests alongside
  all existing auth suites. A temporary `NotificationHarnessDiscoveryTest`
  loaded `NotificationTestClock()` and `SessionAuthorizedTransport::class.java`.
  All 31 tests passed, including 30 auth/Clerk tests; the probe was then removed.
- Final unchanged standard command after removal passed: 30 tests, zero
  failures/errors/skips. No Android test-source configuration change was needed.
- Resolved debug runtime graph and merged manifest contain no OneSignal location
  module, aggregate OneSignal module, Google/Huawei location dependency, or
  location permission. This is debug-variant evidence only.

## Exact commands and logs

Commands below run from repository root unless stated otherwise.

| Command                                                                                                                                                                                                       | Result                                                               | Evidence                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @weave/mobile run test:native:android`                                                                                                                                                         | Exit 1: sandbox blocked Gradle wrapper cache lock                    | [Initial log](logs/android-foundation-baseline.txt)                                                                     |
| Same command with Gradle cache/network access                                                                                                                                                                 | Exit 1: new OneSignal/transitive modules absent from dependency lock | [Resolution failure](logs/android-foundation-baseline-escalated.txt)                                                    |
| From `apps/mobile/android`: `./gradlew :app:testDebugUnitTest :clerk-api:testDebugUnitTest --no-daemon --write-locks`                                                                                         | Exit 0, 30 tests; 43 s                                               | [Lock resolution and baseline](logs/android-foundation-lock-resolution.txt)                                             |
| `pnpm --filter @weave/mobile run test:native:android` with temporary discovery probe                                                                                                                          | Exit 0, 31 tests; 49 s                                               | [Discovery log](logs/android-foundation-discovery.txt), [suite results](logs/android-foundation-discovery-results.json) |
| From `apps/mobile/android`: `./gradlew :app:dependencies --configuration debugRuntimeClasspath :app:dependencyInsight --configuration debugRuntimeClasspath --dependency error_prone_annotations --no-daemon` | Exit 0; resolved dependency path inspected                           | [Dependency graph](logs/android-foundation-dependencies.txt)                                                            |
| `pnpm --filter @weave/mobile run test:native:android` after removing probe                                                                                                                                    | Exit 0, 30 tests; 9 s                                                | [Final baseline](logs/android-foundation-final.txt), [suite results](logs/android-foundation-final-results.json)        |

Permission/artifact audit parsed the merged debug manifest with Python
`xml.etree.ElementTree` and inspected the actual Gradle runtime dependency report.
See [audit results](logs/android-foundation-location-audit.json).

## Dependency prerequisite moved forward

The installed RN OneSignal 5.5.15 Gradle integration chooses modular native SDK
5.10.2 only when `ONESIGNAL_DISABLE_LOCATION=true` or its supported Gradle
equivalent `onesignal.disableLocation=true` is supplied. Added the latter to
`apps/mobile/android/gradle.properties` before resolving dependencies. No other
T041 presentation/config behavior was implemented.

`apps/mobile/android/app/gradle.lockfile` adds approved OneSignal modules and
their transitives for exercised debug compile/runtime/test configurations. A
per-artifact/per-configuration comparison against HEAD found no removed entries.
The only changed existing version is `com.google.errorprone:error_prone_annotations`
2.15.0 → 2.26.0 in debug runtime and debug unit-test runtime. Dependency insight
traces that requirement to OneSignal notifications → Firebase messaging →
Firebase components 18.0.0. Existing auth, framework and buildscript versions
remain unchanged. Release/optimized configurations still need resolution and
verification with their later native builds.

## Limits

The foundation fake currently provides the controlled clock; deferred operation
fakes can be added with the behavior tests that need them. No notification
behavior, real OS permission dialog, provider credential, account binding,
delivery, APK assembly or release build was tested in this slice. Existing
upstream Kotlin/Java deprecation and Gradle 10 compatibility warnings remain.
