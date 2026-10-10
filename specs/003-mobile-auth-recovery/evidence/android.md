# Android implementation evidence — WEA-10

## T003–T005/T008 setup (2026-10-08)

- Vendored Clerk Android API1.1.11 source from verified revision `5d1895dc401a76dd3244eac925ebf87409561a47`, retaining MIT LICENSE, source resources/manifest, consumer rules, upstream dependency catalogue and provenance.
- Minimal source library builds inside the existing RN Android project. It excludes upstream publishing, docs, UI, sample and telemetry projects. Exact Kotlin2.4.20/serialization2.4.20/KSP2.3.12 match upstream; RN AGP8.12.0, Gradle9.3.1 and JDK17 remain. SDK/application Kotlin source compilation succeeded in the first privacy test run.
- `cd apps/mobile/android && ./gradlew :app:tasks --all`: exit0, BUILD SUCCESSFUL in18s.
- Typed TurboModule generated in `com.weave.auth`, injected AuthenticationService shell, manual package registration. Shell always unavailable; no login behavior yet.

## T004/FR-012 maintained SDK privacy patch RED

Command: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.ClerkPrivacyTest`.

Executed against unchanged pinned upstream ClerkLog. Exit1; test compiled and executed: **1 test, 1 expected behavioral failure**, `ClerkPrivacyTest.FR012 provider errors never reach stdout at any severity`. Expected empty diagnostic output; actual captured stdout contained the synthetic marker from error/warning/info fallback sinks. Raw Android Log methods throw in host unit tests, exercising the upstream stdout fallback. No real secret used. Full local output: `/private/tmp/weave-android-privacy-red.log`; generated JUnit XML at `apps/mobile/android/app/build/test-results/testDebugUnitTest/TEST-com.weave.auth.ClerkPrivacyTest.xml` (overwritten on later run).

GREEN applies the approved sink suppression but preserves public `object ClerkLog` and Int-returning signatures. No runtime auth behavior change.

GREEN/shell verification: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest`, exit0, BUILD SUCCESSFUL in4s. Two authored tests passed (privacy sink suppression and callable fail-closed shell), zero failures. Generated NativeWeaveAuthSpec, package registration and app Kotlin/Java compiled successfully. Log: `/private/tmp/weave-android-shell-green.log`.

Storage source inspection: SDK StorageCipher uses Android Keystore AES/GCM. StorageHelper absorbs cipher/encryption/decryption failures and ignores SharedPreferences.commit return values; there is no published storage-health/error stream. Authored service tests can prove mapping of observable storage exceptions, but cannot establish detection of all silently swallowed SDK persistence failures. This limitation must remain explicit rather than claiming complete production storage-failure visibility.

Native APK setup compile: `cd apps/mobile/android && ./gradlew :app:assembleDebug`, exit0, BUILD SUCCESSFUL in1m45s. Built all four configured ABIs, APK packaging and signing validation passed. Log: `/private/tmp/weave-android-shell-build.log`. This is a compile check only, no provider/device claim.

## T014 authentication contract RED

Command: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.AndroidAuthenticationContractTest`.

Executed against the callable ClerkAuthService shell after native/codegen/harness imports compiled. Exit1, **10 authored tests, 10 expected assertion failures**: S02 password activation/fresh validation, S05 cached session/provider task rejection, S16 opaque OTP/request/verify/resend, S19 email device trust, S20 unsupported MFA/new-password/unknown states, S17/S18 Google no-transfer/existing-only, S03/S04/S16 safe observable failure/rate-limit mapping, S07 ordered invalidation, FR007 stale password cleanup, and configuration failure. Shell returns unavailable rather than the required behavior; no import/tooling failure counted as RED. Log: `/private/tmp/weave-android-auth-red.log`.

Locked native resolution: `cd apps/mobile/android && ./gradlew :app:dependencies :clerk-api:dependencies --write-locks`, exit0, BUILD SUCCESSFUL in14s. Generated app/SDK lockfiles and settings plugin lockfile; all configurations use dependency locking. Upstream test fixtures are omitted from the minimal consumer source dependency; authored app contract/privacy tests are the CI test target. Source license, runtime implementation/resources and immutable revision are retained. Log: `/private/tmp/weave-android-locks.log`.

## T016 policy/SDK GREEN and T023 bootstrap RED

T016 policy tests first passed against injected SDK facts; concrete NativeClerkSdk then compiled against pinned low-level SignIn/password/identifier/email/device trust/Google APIs. An initial compile used Identifier's positional argument incorrectly; fixed to named `identifier` (not counted as behavioral RED).

T023 RED: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.AndroidBootstrapContractTest`, exit1:2 tests ran,1 expected assertion failure (valid public key shell did not invoke configuration). Missing key test passed. Log `/private/tmp/weave-android-bootstrap-red.log`. GREEN catches invalid key/provider startup errors without raw logs, injects public environment key, disables SDK debug/telemetry, and leaves missing configuration failclosed.

SDK owns callback receiver through merged library manifest: `clerk://com.weave.callback` and `clerk://com.weave.oauth`, exported SSOReceiverActivity delegates to SDK pending-flow validation; MainActivity has no credential link handler. Fragment restoration uses installed screens RNScreensFragmentFactory before super.onCreate. RN0.86.3's installed ReactActivity uses OnBackPressedDispatcher for target36, so MainActivity explicitly enables predictive-back callback support. Source reference: `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/ReactActivity.java:29` and [Android predictive back documentation](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture). Device gesture/recreation/provider callback behavior remains unrun.

US1 GREEN: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`, exit0 BUILD SUCCESSFUL in15s,16 authored tests passed. Native password/email OTP/email device trust/no-transfer Google implementation calls the pinned SDK; native module registered through the composition root singleton. Log `/private/tmp/weave-android-us1-green.log`.

## T026 logout RED and stale-result regression RED

Command `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.AndroidAuthenticationContractTest`, exit1;17 tests executed,6 expected behavioral assertion failures:4 missing logout outcomes (cleared, still active with safe error, locally cleared partial failure, unresolved storage failure), duplicate pending call incorrectly invalidating first operation, and failed obsolete-session cleanup allowing subsequent restoration. Existing10 login tests and obsolete signout safety passed. Log `/private/tmp/weave-android-logout-red.log`.

T028 implementation targets only the requested current-session ID, fresh-validates actual remaining state, and returns signedOut/active/unavailable with safe failure where relevant. Obsolete newly-created sessions remain quarantined until their cleanup succeeds, preventing failed cleanup followed by restoration. Duplicate pending commands cannot invalidate a live first operation. No additional SDK storage patch applied.

T028 GREEN: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`, exit0 BUILD SUCCESSFUL in3s.23 authored tests passed,0 failures; updated debug APK assembled. Auth17/bridge2/bootstrap2/privacy1/shell1 tests execute in the CI-targeted app native suite. Log `/private/tmp/weave-android-logout-green.log`.

Current production limitations: no live Clerk public key/accounts, configured Google redirect, physical device or accessibility run supplied. Provider/device/restart/process-death journeys remain unrun. The SDK's internal StorageHelper lacks a public storage-health seam and silently swallows cipher/read/write/commit failures; observable exceptions are safely mapped and persistence outcome is fresh-validated, but complete swallowed failure detection is not claimed. No SDK auth/storage behavior is patched beyond approved logging suppression.

## T035 concrete SDK safe-error/rate-limit regression

RED `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.ClerkErrorMappingTest`, exit1;3 tests executed,2 meaningful failures: missing provider Retry-After header hint and malformed nonprimitive retry metadata throwing instead of safe mapping. Existing concrete Clerk credential/unknown-account/invalid-expired code mappings passed with seeded raw message/token fields. Log `/private/tmp/weave-android-error-mapping-red.log`.

GREEN narrows optional metadata to JsonPrimitive and consumes nonnegative numeric provider Retry-After; no raw body/message/stack escapes. SDK HTTP logging middleware only executes if Clerk.debugMode=true; app bootstraps enableDebugMode=false, and ClerkLog's five severity sinks are fully suppressed regardless. No authored native Log/println/printStackTrace calls exist.

Concrete SDK mapping GREEN/final lock check: `cd apps/mobile/android && ./gradlew :app:buildEnvironment :app:dependencies :clerk-api:dependencies :app:testDebugUnitTest :app:assembleDebug --write-locks`, exit0 BUILD SUCCESSFUL in18s,26 tests passed. Root buildscript dependency locking now retains Kotlin/serialization/KSP/AGP build tool graph. Log `/private/tmp/weave-android-final.log`.

## S08/S17 minimal SDK cancellation bridge and observer containment

Finding: upstream SSOService awaits a pending CompletableDeferred and exposes only internal cancellation. Public Clerk.reset cancels but wipes cached credentials, so it is inappropriate for recovery/method switching. Adopted reversible integration bridge on2026-10-08 under full implementation authorization: expose only existing internal SSOService.cancelPendingAuthentication; retain unchanged SDK provider policy/callback matching/session/storage behavior. No broad auth/persistence patch.

Capability RED: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest :clerk-api:testDebugUnitTest --write-locks`, exit1; SDK capability test executed and failed expected `Pending Google flow must complete` against the callable bridge shell. Log `/private/tmp/weave-android-cancellation-red.log`. SDK fake fixtures inject pending native deferred/cached session and secure-store observer; no remote account or synthetic provider success is used.

App RED: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.AndroidAuthenticationContractTest`, exit1;20 tests,3 expected behavior failures: abandoned Google did not release SDK pending state/allow password retry, SDK event storage inspection error escaped, and released subscriber error escaped into SDK coroutine. Log `/private/tmp/weave-android-abandon-event-red.log`. An earlier wildcard filter selected no tests and is excluded from RED evidence.

GREEN delegates cancellation only on explicit abandonment/disposal; resource-only clearAttempts remains separate. Native abandonment yields for cancelled SDK continuation to release serialization before the next method. Existing SDK callback code rejects absent pending flows, so late abandoned callbacks cannot activate through this bridge. Event inspection/subscriber exceptions stay within safe native snapshots and never reach raw SDK/application diagnostic sinks.

Cancellation GREEN compile attempt initially failed in KSP with Gradle daemon Metaspace exhaustion after repeated source recompiles. This tooling failure is not behavioral RED. Increased Gradle MaxMetaspaceSize from512MiB to1024MiB and use a fresh `--no-daemon` verification to match CI scripts.

Cancellation/containment GREEN: `cd apps/mobile/android && ./gradlew :app:dependencies :clerk-api:dependencies :app:testDebugUnitTest :clerk-api:testDebugUnitTest :app:assembleDebug --write-locks --no-daemon`, exit0 BUILD SUCCESSFUL in1m2s. **29 app tests plus1 SDK capability test passed**,0failures/errors/skips. All four debug ABIs and APK packaging passed. This run proves capability cancellation releases the pending SDK deferred, clears pending callback ownership, preserves cached native session, performs zero secure-store interactions, and permits the next password method. Log `/private/tmp/weave-android-cancellation-green.log`.

## Persisted output excerpts

These excerpts are extracted from actual local command outputs, preserving RED/GREEN evidence after generated Gradle reports are overwritten.

`weave-android-privacy-red.log`:

```text
ClerkPrivacyTest > FR012 provider errors never reach stdout at any severity FAILED
1 test completed, 1 failed
BUILD FAILED in 1m 26s
```

`weave-android-auth-red.log`:

```text
AndroidAuthenticationContractTest > S16 email code creates opaque challenge verifies and resends same attempt across generations FAILED
AndroidAuthenticationContractTest > FR007 obsolete password completion ends its new session after abandon FAILED
AndroidAuthenticationContractTest > S02 password completion activates then validates a real provider session FAILED
AndroidAuthenticationContractTest > S05 resolution refreshes cached session and blocks pending provider tasks FAILED
AndroidAuthenticationContractTest > S19 password client trust uses email device verification before activation FAILED
AndroidAuthenticationContractTest > S07 native invalidation emits ordered credential-free signed out event FAILED
AndroidAuthenticationContractTest > configuration missing fails closed without SDK access FAILED
AndroidAuthenticationContractTest > S03 S04 S16 storage cancellation invalid expired and provider rate limit are sanitized FAILED
AndroidAuthenticationContractTest > S17 S18 Google forbids signup transfer and rejects unknown account FAILED
AndroidAuthenticationContractTest > S20 unsupported MFA new password and unknown states never activate FAILED
10 tests completed, 10 failed
BUILD FAILED in 1s
```

`weave-android-bootstrap-red.log`:

```text
AndroidBootstrapContractTest > T023 public publishable configuration initializes once without crash FAILED
2 tests completed, 1 failed
BUILD FAILED in 2s
```

`weave-android-logout-red.log`:

```text
AndroidAuthenticationContractTest > S10 remote signout failure before local clear returns freshly validated active with safe error FAILED
AndroidAuthenticationContractTest > S10 signout with unresolved persistence cannot report success FAILED
AndroidAuthenticationContractTest > S08 duplicate pending native command does not invalidate first operation FAILED
AndroidAuthenticationContractTest > S10 partial signout failure after local clear returns signed out with safe error FAILED
AndroidAuthenticationContractTest > S09 signout ends only requested current session and returns cleared state FAILED
AndroidAuthenticationContractTest > FR007 failed obsolete cleanup keeps its persisted session quarantined FAILED
17 tests completed, 6 failed
BUILD FAILED in 1s
```

`weave-android-error-mapping-red.log`:

```text
ClerkErrorMappingTest > S16 provider Retry-After header is preserved without reading raw diagnostic body FAILED
ClerkErrorMappingTest > FR012 malformed provider retry metadata cannot throw or expose raw secret FAILED
3 tests completed, 2 failed
BUILD FAILED in 2s
```

`weave-android-cancellation-red.log`:

```text
WeaveAuthenticationBridgeTest > S17 cancellation completes SDK pending flow without clearing cached session or secure store FAILED
1 test completed, 1 failed
BUILD FAILED in 24s
```

`weave-android-abandon-event-red.log`:

```text
AndroidAuthenticationContractTest > S17 abandoned Google releases SDK pending flow and allows following password method FAILED
AndroidAuthenticationContractTest > FR012 released event consumer cannot leak exception into SDK coroutine FAILED
AndroidAuthenticationContractTest > FR012 SDK event inspection failure emits safe unavailable without throwing diagnostics FAILED
20 tests completed, 3 failed
BUILD FAILED in 16s
```

`weave-android-cancellation-green.log`:

```text
BUILD SUCCESSFUL in 1m 2s
```

Final JUnit report summary (observed immediately after final GREEN):

```text
com.weave.auth.AndroidAuthenticationContractTest: tests=20, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:06.679Z
com.weave.auth.AndroidBootstrapContractTest: tests=2, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:06.756Z
com.weave.auth.ClerkErrorMappingTest: tests=3, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:06.758Z
com.weave.auth.ClerkPrivacyTest: tests=1, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:06.784Z
com.weave.auth.WeaveAuthBridgeTest: tests=2, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:06.786Z
com.weave.auth.WeaveAuthModuleTest: tests=1, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:07.551Z
com.clerk.api.sso.WeaveAuthenticationBridgeTest: tests=1, failures=0, errors=0, skipped=0, timestamp=2026-10-08T07:16:03.796Z
```

## Post-restoration frozen verification and final contract correction

Only authored Kotlin files were formatted with upstream checksum-verified ktfmt0.64 (`5b3d5286fd2defcc7dc8e28c21ddf156cc6b2d8682bdcd929ce4333e7a6201f2`); upstream runtime sources were otherwise untouched. Source integrity comparison against pinned revision confirms only existing-file difference `kotlin/com/clerk/api/log/ClerkLog.kt`; the separate Weave-owned cancellation bridge is the sole new runtime source file.

After the root's frozen npm restoration:

- `npm run test:native:android --workspace=@weave/mobile`: exit0 BUILD SUCCESSFUL in38s,29app+1SDK tests passed, no lock update. Log `/private/tmp/weave-android-frozen-tests.log`.
- `npm run native:android --workspace=@weave/mobile`: exit0 BUILD SUCCESSFUL in3m52s, all four ABIs/APK package passed. Log `/private/tmp/weave-android-frozen-build.log`.

Final FR007 acknowledgement RED: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest --tests com.weave.auth.AndroidAuthenticationContractTest --no-daemon`, exit1,20tests1expected failure. Pending native password abandonment incorrectly acknowledged signedOut before cleanup. Added assertion in the existing stale-session regression, preserving late-session compensation. Log `/private/tmp/weave-android-abandon-ack-red.log`:

```text
AndroidAuthenticationContractTest > FR007 obsolete password completion ends its new session after abandon FAILED
    org.junit.ComparisonFailure at WeaveAuthModuleTest.kt:239
20 tests completed, 1 failed
BUILD FAILED in 10s
```

GREEN acknowledges abandonment as unavailable; fresh resolution/reconciliation alone reports the actual session outcome. TypeScript abandonment deliberately ignores the acknowledgement, so controls/navigation remain governed by their existing generation/state rules.

Final frozen command: `cd apps/mobile/android && ./gradlew :app:testDebugUnitTest :clerk-api:testDebugUnitTest :app:assembleDebug --no-daemon`, exit0 BUILD SUCCESSFUL in12s;30native tests passed and final APK assembled. No dependency lock update/bypass. Log `/private/tmp/weave-android-frozen-final.log`. `git diff --check` on owned Android/vendor/evidence paths passed.

Final test report totals:

```text
com.weave.auth.AndroidAuthenticationContractTest: 20 tests, 0 failures, 0 errors, 0 skipped
com.weave.auth.AndroidBootstrapContractTest: 2 tests, 0 failures, 0 errors, 0 skipped
com.weave.auth.ClerkErrorMappingTest: 3 tests, 0 failures, 0 errors, 0 skipped
com.weave.auth.ClerkPrivacyTest: 1 tests, 0 failures, 0 errors, 0 skipped
com.weave.auth.WeaveAuthBridgeTest: 2 tests, 0 failures, 0 errors, 0 skipped
com.weave.auth.WeaveAuthModuleTest: 1 tests, 0 failures, 0 errors, 0 skipped
com.clerk.api.sso.WeaveAuthenticationBridgeTest: 1 tests, 0 failures, 0 errors, 0 skipped
```

Provider/device/cold-warm callback/restart/process-death/TalkBack/enlarged-text/transition timing remain unrun. Complete detection of SDK-swallowed storage failures remains a documented limitation; no persistence patch was adopted. These are not green acceptance checks.
