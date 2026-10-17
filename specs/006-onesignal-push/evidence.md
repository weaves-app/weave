# WEA-29 implementation evidence

Base: PR #13, `75814ad85894460ddeae46c9aa337f0d09463f5c`. User explicitly confirmed S01–S11 and the stack on 2026-10-17. Personal repository identity checked before integration. Existing untracked user files preserved.

## Setup

2026-10-17: fast-forward integration succeeded. Exact dependencies adopted using `pnpm --store-dir /Users/pravinraj/Library/pnpm/store --filter @weave/mobile add --save-exact react-native-onesignal@5.5.15` and equivalent API add for `@clerk/backend@3.23.0 jose@6.2.12`. Both exit 0. Store selection preserves the installed workspace. Diff review: only intended importer/package/snapshot additions; API manifest sorting only otherwise. No unrelated dependency version changes.

## Behavioral evidence

Each completed slice below records scenarios, command, timestamp, observed RED assertion, GREEN and refactor result. Tooling failures are recorded separately and never counted as behavioral RED.

## External acceptance

| Scenarios    | Required check                                                                        | Result                                                            |
| ------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| S01–S02      | Android/iOS permission and settings                                                   | Not performed                                                     |
| S03–S05, S11 | Two accounts/installations, signed binding, server proof, actual three-state delivery | Not performed; provider beta/configuration and devices unverified |
| S06–S07      | Cold/warm safe launch and hostile URL payloads                                        | Not performed                                                     |
| S08–S09      | Offline recovery, logout, Reload and races                                            | Not performed                                                     |
| S10          | VoiceOver/TalkBack, enlarged text and sanitized device logs                           | Not performed                                                     |

No notification sent and no provider configuration changed.

## Permission and controls — S01/S02

2026-10-17: runnable no-op controller and null view scaffold first; mobile typecheck exit0 and baseline 29 suites/227 tests pass (mobile-baseline.txt), API baseline2/2 pass. Jest needs `--watchman=false` in sandbox; initial Watchman permission error was tooling, not RED.

RED: `node ../../node_modules/jest/bin/jest.js --runInBand --watchman=false src/features/notifications` from apps/mobile. 12/12 failed for absent permission-needed state, missing explicit Enable dispatch and missing rendered controls; see evidence/permission-red.txt. GREEN: same command after controller/view implementation,12/12 pass (evidence/permission-green.txt). No ready state is produced from local allowed/registered observations. Native/provider acceptance remains unperformed.

## Native harnesses — T008

Android existing contracts 30/30 pass; temporary discovery probe proved the notifications package runs with auth, then was removed. Minimal modular OneSignal lock resolution and location-disabled configuration are detailed in [Android foundation](evidence/android-foundation.md). iOS host and simulator baseline each pass31 auth tests; deterministic source discovery includes notification sources/tests and retains auth. See [iOS foundation](evidence/ios-foundation.md). These prove harness loading, not notification delivery.

Permission refactor/full regression:31 suites/239 tests pass (evidence/permission-refactor.txt). Runtime RED:1 expected missing-auth-binding failure and1 existing disposal regression pass (evidence/runtime-red.txt). Home RED: missing Enable control with normal Home/Logout rendered (evidence/root-red.txt). Runtime/root GREEN:15 focused tests pass after integration and correcting the fake to echo the captured generation (evidence/runtime-green.txt).

## US1 completion and readiness slice

US1 full mobile regression:33 suites/242 tests pass (evidence/us1-mobile.txt); typecheck exit0. Android final40/40 and iOS host/simulator40/40 pass with actual behavioral RED and refactor runs; see [Android permission](evidence/android-permission.md) and [iOS permission](evidence/ios-permission.md). UI demo uses an injected platform; real SDK composition and physical permission acceptance remain later tasks.

S11 mobile proof RED:17 tests ran,13 expected failures and4 ineligible-local-state regressions passed (evidence/readiness-red.txt). Command: `node ../../node_modules/jest/bin/jest.js --runInBand --watchman=false src/features/notifications/readiness.test.ts`. GREEN after proof/cooldown implementation: entire notification suite32/32 (evidence/readiness-green.txt). Includes native-duration/JS-start cap, invalid correlation/revisions, delayed proof, A→B→A, loss/rotation/background, duplicate observations, expiry without polling and cooldown without automatic retry. Server behavior and native credentials are separate pending tasks.

## Root ownership review fixes — S04/S09

Review found pending auth/logout could rebind, factory removal retained stale panel, and partial setup/disposal could leak resources. Added actual failing assertions before fixes: root-lifecycle-red.txt (2failures), runtime-ownership-red.txt (3failures). The first listener-setup fixture accidentally recursed through Jest's already-mocked AppState method and failed before notification acquisition; root-setup-red.txt is **invalid behavioral evidence**. Reverted the attempted cleanup guard, corrected the external listener fake, asserted acquisition, observed the actual release failure (root-setup-corrected-red.txt:1failed/2passed), then restored the guard. This records the correction instead of claiming the initial fixture failure proved notification cleanup.

Root ownership fixes GREEN: all37 notification tests pass (evidence/root-lifecycle-green.txt); mobile TypeScript exit0. Focused lint/format follow-up is recorded separately.

## Integration rulings

2026-10-17: exact RN OneSignal5.5.15 iOS wrapper unconditionally swizzles launch and initializes a nil app ID. Planned native composition will disable iOS wrapper autolinking and directly pin modular OneSignalXCFramework/OneSignal5.8.0, preserving the SDK version and single coordinator ownership without duplicate frameworks. SDK console/alert logs must be disabled before initialization. Provider remote diagnostic logging remains an explicit privacy acceptance prerequisite because SDK remote sinks are independent of console level; no remote provider setting changed.

S04 intent ordering: added a failing assertion that signed-out reconciliation must carry generation2 after active generation1, and an older active context must not restart setup. RED: signed-out-generation-red.txt; GREEN:38 notification tests pass in signed-out-generation-green.txt. Extended the platform reconcile port to carry generation for null contexts and documented the exact shared native envelope in contracts/bridge-wire.md. This closes an implementation gap in the existing all-requests-generation contract.

## Backend verification — US5 / T019–T029 / T032

Backend implementation and refactor complete: **90 API tests and 10 actual PostgreSQL integration tests pass**, including fresh compiled-runtime production composition. Typecheck/lint/format and repository architecture checks pass. See [backend evidence](evidence/backend.md) for exact command manifests, behavior RED/GREEN records, configuration, and the cleanup-lease/429-body review fixes. Local PostgreSQL only; provider requests intercepted. T032 checkpoint combines these results with the mobile proof suite. Native account wiring is the next increment, not inferred from server tests.

## Strict JS bridge, default composition and safe opens

T037: [gateway RED](evidence/logs/gateway-red.txt) ran24 tests with14 failures against the runnable placeholder;10 rejection regressions already passed. [GREEN](evidence/logs/gateway-green.txt):24/24 after strict allowlist/envelope/correlation validation, stale intent dropping, safe native errors and event filtering. No credential or private payload field is copied into trusted results. T038 JS portion/default root: [RED](evidence/logs/default-root-red.txt) showed missing Notifications on active Home; [GREEN](evidence/logs/default-root-green.txt) shows production default runtime with safe unavailable/retry state when native module is absent. An intermediate missing transport file was a shell chaining/tooling mistake, corrected before the final GREEN; not a behavior RED. Native bridge wiring remains in progress.

T046: [root open regression](evidence/logs/open-root-baseline.txt) passes4 session-gate cases against existing code. Malicious, malformed, duplicate and old-root notification envelopes cause no auth commands/state changes or protected-screen flash. Expired-session case models auth resolving it to signedOut. These passed without production changes; no RED fabricated. Actual OS URL launch tests remain native/device work.

## Accessibility and recovery integration

T053: initial accessibility fixture did not set AppState active and failed before reaching its scroll assertion; [initial run](evidence/logs/accessibility-red.txt) is not evidence of missing scroll behavior. Corrected fixture [RED](evidence/logs/accessibility-corrected-red.txt) fails because Home has no ScrollView. [GREEN](evidence/logs/accessibility-green.txt) passes2 tests after enabling an unconstrained, token-spaced scroll variant of the existing Screen primitive for Home. Default text scaling and untruncated labels are preserved. One polite state announcement and bounded disabled Retry are asserted; physical enlarged-text/VoiceOver/TalkBack remain unperformed.

A full mobile run exposed2 existing auth Reload regressions ([run](evidence/logs/mobile-integrated.txt),294passed/2failed): notification's synchronous external-store listener read a deliberately faulted auth store and threw outside React's error boundary. The runtime now treats that callback failure as immediate signed-out notification intent, leaving auth recovery in control. [Targeted GREEN](evidence/logs/auth-store-recovery-green.txt) includes existing auth Reload scenarios and new notification suites. T049 integration [baseline](evidence/logs/recovery-privacy-baseline.txt) additionally passes delayed-proof Logout/form preservation,401/429/503 recovery, Retry overlap and sentinel privacy checks against existing implementations. No new RED claimed for these already-satisfied cases. T054 JS privacy covers bridge/store/authored-log sentinel containment; native/privacy acceptance is separate.

User direction: “Not yet—finish the code and document remaining setup.” Continue all authorized code and automated work; do not mark T043/T048/T056 device/provider acceptance complete.

## Independent JavaScript review and refactor

An independent reviewer exercised the real native gateway plus controller and found two readiness races: failed refresh retained an old proof, and an obsolete failed request could overwrite newer denied permission. [RED](evidence/logs/review-proof-red.txt):2failures/17passes. [GREEN](evidence/logs/review-proof-green.txt):19/19 after clearing proof on current failure and checking the attempted revision before publishing failure. Reviewer independently reran both reproductions successfully and reported no remaining Critical/Important findings within the JavaScript scope. Native code and real delivery were outside that review.

Scoped mobile lint exposed type-safety issues in tests and the effect-owned runtime's synchronous React state publication. Refactored runtime activation to a pure external-store container observed through useSyncExternalStore; native acquisition/release remain effect-owned. Existing factory replacement, setup cleanup and auth Reload tests cover lifetime semantics. [Full mobile refactor](evidence/logs/mobile-refactor-green.txt):**40 suites/303 tests pass**. Earlier root-level eslint invocation did not enable all package-scoped typed rules; final verification uses `pnpm --filter @weave/mobile lint` / root verify. [Scoped lint](evidence/logs/mobile-scoped-lint.txt) exits0. Native source/config integration is still progressing separately.

## Repository and database checkpoint

`DATABASE_URL=postgresql://weave@127.0.0.1:55449/wea29_verify pnpm run verify` exited0 in [repository verification](evidence/logs/repository-verify-green.txt): package-scoped lint/architecture, repository formatting, types, policy/web/API/mobile tests and API/web/Android+iOS JavaScript bundles. This checkpoint has303 mobile tests; later account/attempt changes require final rerun. Initial [verification](evidence/logs/repository-verify.txt) stopped on scoped lint; fixes are described above.

`DATABASE_URL=postgresql://weave@127.0.0.1:55449/wea29_verify pnpm run test:integration` exited0, **13/13** including existing workspace health/database behavior and new notification concurrency/runtime tests ([transcript](evidence/logs/integration-full.txt)). This is an isolated local fixture, not provider/device acceptance.

T042 root success path additionally passes against an injected native platform: Home stays pending until the matching proof resolves, then shows ready with auth state and Logout preserved; see [account root](evidence/logs/account-root-green.txt). Existing behavior passed without a new production change.

## Bounded attempt replay protection

Native review found Android's128-entry cap eventually stopped all distinct retries, while iOS's cleared replay Set permitted old attempt reuse. Refined the unpublished v1 bridge contract to canonical positive safe-integer decimal attempt IDs and a highest-accepted sequence per lease. Retain it across auth generations and repeated acquisition of the same lease; reset only on a new lease. This keeps bounded memory without artificial retry limits or replay eviction. JS controller/gateway [RED](evidence/logs/attempt-sequence-red.txt):7failed/43passed; [GREEN](evidence/logs/attempt-sequence-green.txt):50/50. Native regression/fix records remain in each platform's implementation report.

## Requirement and acceptance traceability

The table distinguishes automated coverage from controlled-environment acceptance. A covered code path does not imply device delivery success. Platform implementation reports supply final native command counts and source/test mappings.

| Requirement / outcome  | Automated seam / evidence                                                                                                                          | Acceptance remaining                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| FR-001, FR-006; SC-002 | Native coordinator/presentation adapters and SDK builds; default App runtime; root account tests                                                   | Plain push receipt on Android/iOS in foreground, background and normally terminated states                           |
| FR-002; SC-001         | JS permission/control tests; native permission adapters; explicit-only Enable path                                                                 | OS permission/settings matrix on both platforms, including Android runtime-prompt applicability                      |
| FR-003; SC-008         | Readiness controller, strict bridge, exact provider matching, compiled API tests, expiry/revision/correlation and attempt-sequence tests           | Exact installed device reaches ready with real server/provider confirmation                                          |
| FR-004, FR-005; SC-003 | Native session-bound transport/authority, account coordinator races; backend live-session authentication; root delayed-proof Logout test           | Two accounts/two installations, new targeting after remote cleanup acknowledgement and unchanged second installation |
| FR-007; SC-004         | Root notification-open tests; native URL suppression/config tests                                                                                  | Cold/warm real HTTPS/custom-scheme/duplicate/old-account taps on both platforms                                      |
| FR-008, FR-009; SC-005 | Root factory/disposal/Reload, auth-store fault, coalescing, offline/delayed/error/cooldown and replay tests                                        | Real offline/reconnect, repeated Reload and account races with installed SDK/platform services                       |
| FR-010; SC-007, SC-008 | Strict private-field rejection; sentinel bridge/store/HTTP/provider-error tests; native redaction and resolved artifacts                           | Sanitized physical-device log review; provider remote diagnostics disabled                                           |
| FR-011; SC-006         | English catalog inventory, accessible controls and one polite state message; scrollable Home with scaling/untruncated labels                       | Enlarged-text operability and VoiceOver/TalkBack on Android/iOS                                                      |
| FR-012; SC-007         | Scenario-to-task mapping and chronological evidence ledger; explicit external table above                                                          | T043/T048/T056 remain open; user explicitly deferred setup rather than waiving these outcomes                        |
| FR-013; SC-008         | 90 API tests and13 full PostgreSQL/workspace integration tests; server-only signer, HMAC budgets, no-store/strict HTTP, bounded provider responses | Configure matching trusted Clerk/OneSignal production-like test environment and verify real device response          |

S01/S02 map to permission, UI and settings tests; S03/S04 to account/authority/transport and delayed-result tests; S05 to presentation and root preservation; S06/S07 to native launch and root-gate tests; S08/S09 to failure/recovery/lifetime/replay; S10 to English/accessibility/privacy; S11 to API/PG and proof-correlation tests. Every corresponding real-device/provider journey remains listed as unperformed until actual evidence is recorded.

## Android implementation and final review

[Android implementation report](evidence/android-implementation.md) maps transport/authority/coordinator/bridge/presentation/open/lifetime/privacy behavior to actual RED/GREEN transcripts. Final Gradle command includes app and Clerk tests, debug assembly and resolved dependency graph: **75 tests,0 failures/errors/skips**, debug APK built for all4 default ABIs. Root reran the report's `android-audit.py` against actual XML/merged manifest/resolved runtime graph and confirmed those counts, APK existence, URL suppression and absence of location modules/artifacts/permissions.

Independent review initially found old-account retirement delayed until the next grant, bounded replay Set defects and duplicate invalidation retry after failure. Subsequent fixes have genuine regression REDs, including stale signed-bind completion and sanitized asynchronous cleanup errors. Final reviewer reports no remaining confirmed Android findings. The SDK wrapper constructor was inspected to ensure it does not register a competing foreground observer. Actual remote IV enforcement/FCM delivery/device behavior and release/optimized variants remain unverified; see report limits. iOS final results are recorded below.

## Architecture and integration audit

Reviewed public notification exports, framework-free application/domain ports, native-only credential transport, composition factories and canonical injection tokens. Repository architecture checks pass. New Home controls reuse the existing Button/Text/Screen primitives, semantic tokens and English catalog; the Screen scroll variant exists to keep enlarged content reachable. Existing auth navigation remains the sole landing authority. No notification sender, inbox, location collection or deployment was added.

The implementation required one narrow deviation from the planning expectation of no Turborepo change: API tests now build before exercising compiled production modules, and Prisma generation requires DATABASE_URL even when no connection is made. After reading the installed Turbo docs, added an API-test task environment declaration for DATABASE_URL with no cached outputs. This makes the test build reproducible under Turbo's environment filtering; no broader task behavior or dependency upgrades were introduced.

Final repository verification first stopped on formatting in the account-delivery test and regenerated Android audit JSON (repository-verify-final.txt). Formatted those files and reran verification; this was a style failure, not behavioral RED. Evidence scans found no private-key blocks or live/test secret-key prefixes in captured reports. Generated test signing keys remain transient fixtures; actual provider credentials were never supplied.

Final repository verification exited0 in [repository-verify-final-green.txt](evidence/logs/repository-verify-final-green.txt): **40 mobile suites / 311 tests**, **90 API tests**, **58 web tests**, **279 policy tests**, types/lint/format/architecture, API/web builds and Android/iOS JavaScript bundles. Previously completed isolated PostgreSQL integration remains **13/13**; backend source has not changed since that run. Native final builds/tests are reported separately.

## Final iOS implementation and independent review

[iOS implementation report](evidence/ios-implementation.md) maps actual native source/test files to T034/T036/T038/T040/T041/T045/T047/T051/T052/T054/T055. **71 host tests and 71 simulator tests pass**, including existing auth coverage. The final simulator command compiles and links the real application, both generated Objective-C++ bridges and exact modular OneSignal5.8.0. Built-artifact inspection confirms URL suppression, push/background configuration, eight modular SDK frameworks/privacy manifests and no location/IAM or competing iOS wrapper. Public values were empty; no configured provider initialization or delivery is inferred.

Final independent review found successful JWT renewal did not rearm the next credential's invalidation episode. [Actual RED](evidence/ios-jwt-rearm.red.txt) records71 tests/4 failed assertions. [Host GREEN](evidence/ios-jwt-rearm.green.txt) and [simulator GREEN](evidence/ios-implementation.native-reviewed.txt) pass71/71 after resetting the consumed episode only on accepted signed replacement and fencing suspended grants against a newer invalidation revision. Reviewer confirmed the fix and pinned SDK same-account JWT replacement semantics; no confirmed remaining iOS findings.

Implementation/source review is complete. T043, T048 and T056 remain unperformed controlled-provider/physical-device acceptance, exactly as requested by the user. The setup guide documents IV, APNs/FCM, trusted Clerk/API settings, public native build settings, signing, provider remote diagnostics, two-account/two-installation journeys and accessibility. No provider provisioning, sends, deployment or Linear Done transition occurred.

Final SDD hook initially rejected the workflow because the recorded user confirmation was under scenarioAgreement without the canonical confirmation field. Copied that existing explicit agreement into the required field; no new or inferred approval. Re-ran SDD validation successfully.

Publication hygiene: trailing whitespace and surplus final blank lines were normalized in captured text transcripts; command output/assertions/results were preserved. The staged diff check includes newly added files, unlike an unstaged check of tracked files alone.
