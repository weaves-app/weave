# WEA-10 implementation evidence

## T001 — Branch and identity setup (2026-10-07)

- Feature artifacts copied to `/private/tmp/weave-wea10-spec-backup/003-mobile-auth-recovery` before checkout.
- Read root/scoped AGENTS.md, constitution and TypeScript/architecture/native/testing standards.
- `git ls-remote origin refs/heads/develop` returned `27698fb1a257259e12946e1526e57b1c6fc58836`. Initial sandbox DNS failure was retried successfully with approved network access; it is not test evidence.
- `git switch -c feat/WEA-10/mobile-auth-recovery develop` succeeded. `git branch --show-current` and `git rev-parse HEAD` confirmed branch/base match the verified remote commit.
- Repository-local name/email: `Pravin Raj` / `pravinrajmb@gmail.com`. `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT` confirmed that same personal identity. No commit or push performed.
- Local hook path is `.githooks`; setup ran no commit/push hooks. Their policies remain in force.
- Checklist scan: requirements.md has 16 checked items and 0 unchecked items; no checklist markers were modified.

## T002 — Scenario agreement confirmed (2026-10-07)

Presented S01–S20; user replied: "Confirm S01–S20 and proceed". Recorded that exact statement and all 20 scenario IDs in workflow.json before source changes. Public seams remain mapped in contracts/scenario-tests.md.

## Setup findings requiring task alignment

Verified develop still uses npm@11.19.0, npm workspaces and package-lock.json. The planned pnpm@11.1.1 environment existed only on the unmerged WEA-8 branch. WEA-10 includes none of those commits. Ruling: preserve develop’s npm workspaces and package-lock.json for WEA-10 rather than importing unmerged WEA-8 work. Updated dependency tasks and quickstart commands accordingly; product behavior and native SDK selection are unchanged. Cost if the base changes later: reassess lockfiles/commands against then-current develop before integration.

Read-only native toolchain inspection reports Xcode 27.0 (27A266a), Swift 6.4, JDK 17.0.15. This establishes installed tool availability only; no SDK integration/build/test success is implied. Sandbox Xcode cache/event-stream warnings were observed.

## Application behavioral test execution

Not started. No RED/GREEN, native compile, live Clerk, device, accessibility, CI, or database-integration results are claimed.

## Baseline and partial dependency adoption

- `npm test --workspace=@weave/mobile -- --watchman=false`: 3 suites / 3 tests passed before dependency adoption.
- Installed exact JS versions: @react-navigation/native7.5.0, native-stack7.20.0 and react-native-screens4.28.0. apps/mobile/package.json and package-lock.json changed. Installation completed, with Node engine warnings (local24.2.0; RN requires24.3.0+) and an audit summary of 54 vulnerabilities. No broad audit fixes were applied. T004 remains incomplete until native integration, locks, and verification.

## T003 — Blocking native SDK privacy capability finding

Read pinned Android/iOS sources downloaded at the exact revisions in contracts/sdk-compatibility.md. Android lower-level Google entrypoint was verified as SignIn.authenticateWithRedirect(params = SignIn.AuthenticateWithRedirectParams.OAuth(provider = OAuthProvider.GOOGLE), transferable = false); it creates the attempt internally, so the earlier research suggestion of manually creating an OAuth attempt is unnecessary.

Compiled the pinned iOS ClerkLogger.swift with contracts/fixtures/ios-logger-probe.swift and a controlled diagnostic sink. The probe uses a synthetic LocalizedError, no real credential. Unmodified source emits the seeded value: exit1. Applying the proposed narrow sanitization to a temporary copy makes the same probe pass: exit0. This is SDK capability evidence, not application authentication RED/GREEN or a complete native build. Android logging behavior is source-inspected only.

Reproducible command pattern (use the verified SDK checkout path and separate binaries):

```sh
swiftc -swift-version 5 -package-name WeaveSDKProbe -module-cache-path /private/tmp/weave-auth-upstream/swift-cache /private/tmp/weave-auth-upstream/ios/Sources/ClerkKit/Logging/ClerkLogger.swift specs/003-mobile-auth-recovery/contracts/fixtures/ios-logger-probe.swift -o /private/tmp/weave-auth-upstream/logger-probe
/private/tmp/weave-auth-upstream/logger-probe
```

Temporary sanitized source was compiled with the same command, substituting ClerkLoggerPatched.swift and logger-probe-patched. Full output/build files are under /private/tmp/weave-auth-upstream. Review-only iOS/Android patch files are attached under contracts/. No vendor changes were applied to application dependencies or remote repositories.

Asked the user to choose scoped maintained SDK patches (recommended) or revisit SDK selection. T003 remains unchecked and dependent authored behavior/native tasks have not begun. This pause follows speckit-implement's rule: "Halt execution if any non-parallel task fails"; do not weaken the approved privacy requirement to mark this gate complete.

## SDK patch adoption authorized (2026-10-08)

User said "accept proposed", accepting the scoped maintained native SDK logging patches. SDK source revisions/licenses will remain tracked. Platform build/test work delegated independently; each platform records its own evidence under evidence/.

Ruling: define shared model/port/codegen interfaces while independent native dependency builds run. These are callable scaffolds, with no authentication implementation. Native integration must verify the shared contract before authored behavior tests/implementation; the controller/native RED-before-GREEN dependencies remain enforced. This avoids hiding interface mismatches until lengthy native builds finish.

## Implementation and review results (2026-10-08)

The earlier "not started"/privacy gate sections are historical snapshots. User accepted SDK logging patches before dependent native behavior. Current production source contains all three existing-account methods, session-driven Login/Home, accurate current-session Logout, and top-level recovery. Native SDKs retain pinned revisions/licenses. Android's minimal authored cancellation bridge exposes only SDK-owned SSO cancellation, preserving storage; this implements confirmed S08/S17 without changing registration/persistence policy. Renderer diagnostics are sanitized through the pinned source transformation documented in contracts/sdk-compatibility.md.

Actual shared behavior evidence under evidence/:

| Tasks / scenarios                               | Meaningful RED                                         | GREEN / refactor                                                                                                      |
| ----------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| T009/T010 boundary privacy/config               | gateway-red.txt                                        | gateway-green.txt; later gateway-ordering-red/green.txt                                                               |
| T011/T012 fresh session/deadline/order/disposal | controller-foundation-red.txt                          | controller-foundation-green.txt                                                                                       |
| T013 labels/secret/feedback                     | primitives-red.txt                                     | foundation-green.txt; final mobile regression                                                                         |
| T015/T018 all methods/challenges/deadlines      | controller-login-red.txt                               | controller-login-green.txt                                                                                            |
| T019/T021 accessible Login                      | login-ui-red.txt                                       | login-ui-green.txt                                                                                                    |
| T020/T022 actual navigation/history             | navigation-red.txt                                     | navigation-green.txt                                                                                                  |
| T027/T029 accurate Logout/duplicates/history    | logout-red.txt                                         | logout-green.txt                                                                                                      |
| T031/T032 explicit recovery/fallback            | recovery.md                                            | recovery.md (7/7)                                                                                                     |
| T033 full App/provider fresh Reload             | app-recovery-red.txt                                   | app-recovery-green.txt (5/5 including later disposal regression)                                                      |
| S17 Google cancellation usable form             | google-form-red.txt                                    | google-form-green.txt                                                                                                 |
| S15 safe-area wrapper                           | login-safe-area-red.txt                                | final mobile regression (the first candidate GREEN used the wrong host prop shape; native edges are additive objects) |
| S05/S16/S19 email-app return; timeout cleanup   | challenge-lifecycle-red.txt                            | challenge-lifecycle-green.txt                                                                                         |
| S09/S10 foreground during Logout                | logout-foreground-red.txt                              | logout-foreground-green.txt                                                                                           |
| S07 duplicate revision cannot undo revocation   | revision-red.txt                                       | revision-green.txt                                                                                                    |
| S10 safe command fallback / intermediate event  | command-fallback-red.txt; unavailable-ordering-red.txt | command-fallback-green.txt; unavailable-ordering-green.txt                                                            |
| FR-012 actual renderer diagnostics              | renderer-privacy-red.txt                               | renderer-privacy-green.txt (caught/uncaught/recoverable; severity/fatality retained)                                  |

Native actual RED/GREEN excerpts, immutable source checks, secure-store capabilities and final compile/test commands are preserved in [Android evidence](evidence/android.md) and [iOS evidence](evidence/ios.md). Android final:30 native tests,0 failures; frozen app build for all4ABIs. iOS final:31 XCTest cases,0 failures on iPhone17 Pro/iOS26.2 simulator; full app compiled/linked, generic simulator arm64/x86_64 build passed. iOS17 minimum is compiled, not claimed tested on iOS17 runtime. Host Swift31/31 is additional evidence. The earlier Xcode plugin failure recovered after simctl automatically installed required support content; it is no longer blocked.

Review findings were fixed through new behavioral RED→GREEN: safe areas, visible password form after cancelled Google, idle OTP preservation through foreground validation, discarded timeout handles, foreground/logout races, duplicate revisions and malformed native events. Added regression proves actual App boundary unmount disposes old auth subscription/operation and Reload uses a greater shared generation before fresh resolution.

## Repository verification and environment recovery

- Initial root verify failed because locked nested signal-exit3.0.7 was absent and proper-lockfile resolved incompatible root4.1.0. Compared installed paths/versions with package-lock.json, then full locked npm ci restored the missing package. No root dependency workaround was committed.
- Prisma then needed the documented local DATABASE_URL and access to its existing external cache. Approved retry used the sample local URL; no private environment value was printed. These are tooling failures, not behavioral RED.
- Clean `npm ci` (normal scripts) exited0. Mobile privacy hook/probe exited0. Installation audit reports58 findings (8 moderate/50 high); no broad dependency upgrades were attempted.
- Final `DATABASE_URL=<documented local sample> npm run verify` exited0 after review/renderer changes. All workspace lint/architecture/format/types/policy/component tests and app builds passed, including79 mobile tests and both production Metro bundles. Full output: /private/tmp/weave-verify-final.txt; key summary retained below after final reconciliation.
- Docker is absent and default localhost database services were unavailable. An isolated Postgres.app18.1 cluster under /private/tmp, bound only127.0.0.1:55439, applied the existing migration and ran `npm run test:integration`:3/3 passed, exit0. Trap stopped the server afterward. This is actual supplemental local integration evidence; Postgres17 CI remains unrun. Logs: /private/tmp/weave-db-deploy.txt and /private/tmp/weave-integration-isolated.txt. No existing data or schema source was changed.
- `git diff --check` passed. Personal author and committer remain Pravin Raj <pravinrajmb@gmail.com>. No commit, push, PR, release, deployment, shared Clerk policy change, or account provisioning performed.

## Acceptance still requiring owner/device evidence

Public Clerk key, registered native identities/callbacks, enabled methods and existing test-account fixtures have not been supplied. Real-provider login, delivered OTP/device verification, unknown-account zero creation, revocation/restart/process death and cold/warm callback checks remain blocked/unrun. Both-platform VoiceOver/TalkBack, enlarged text, keyboard/focus and SC-002 timing remain unrun. Automated simulator/native tests do not substitute for these checks. The pinned SDKs swallow some per-key cached-client persistence errors; injected/health-probe checks cannot prove every later SDK write/clear failure. That plan-level storage-observability gap remains explicit. Required GitHub CI/code-owner review has not run.

No extension file is registered, so before/after implementation and convergence hooks are skipped. Requirements checklist remains read-only16/16 checked. Whole Linear ticket web/signup/invitation work remains outside this mobile slice.

## Explicit scenario traceability

| IDs                     | Current automated evidence                                                                                                                                                                 | Remaining acceptance                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| S01,S02,S05,S06,S07,S09 | Actual RootNavigator tests: conditional routes, no loading flash, fresh restored Home, denied direct Home, replaced Login/Home history and logout reopen fixture                           | Live/device launch, revocation, links and restart            |
| S03,S04,S08,S10,S11     | Controller/gateway/input/Logout UI cases: rejected input, safe unavailable/deadlines, duplicate guards, accurate partial failures                                                          | Physical provider/storage failures and rapid interaction     |
| S12,S13,S14             | Isolated7-case boundary suite and5-case full App integration; SDK/renderer diagnostic probes; disposal/fresh greater-generation Reload and persistent fault guard                          | Actual SDK-session/device recovery and captured logs         |
| S15                     | Primitive/screen labels, feedback, disabled/busy state, safe-area edges and keyboard scroll structure                                                                                      | VoiceOver/TalkBack, focus/enlarged text/contrast             |
| S16,S17,S18,S19,S20     | Native/controller/Login tests: opaque OTP/device-trust verification/resend, limits, Google no-transfer/cancel/foreground deadline, existing-account feedback and unsupported-task blocking | Owner live fixtures and zero-account-creation/callback proof |

Further S04/S07 initialization robustness: actual subscription fault RED→GREEN in evidence/subscription-{red,green}.txt and retry regression in subscription-retry-{red,green}.txt. Startup resolves unavailable safely; retry reinstalls native invalidation before fresh session validation. This adds2 controller cases beyond the preceding79-test snapshot. Final fresh full-suite count is81 below.

CI workflow validation: checksum-pinned actionlint passed through the repository wrapper. The wrapper then exited127 because uvx is absent. Ran the same pinned zizmor1.30.1 checks with `zizmor --offline --format=github .github` in an isolated /private/tmp Python environment: exit0, no findings. This validates workflow syntax/security locally; it is not a GitHub CI run.

Final reconciliation: fresh full verify exited0 after subscription retry fixes (81 mobile cases). Retained actual summaries are in [final-validation.txt](evidence/final-validation.txt); Android JUnit reports30 tests,0 failures/errors/skips. iOS final build/test records remain in evidence/ios.md. Convergence outcome is tasks_appended: T042–T045;35 of45 tasks are proven complete,10 remain unchecked (original acceptance tasks plus their traceable convergence work). This count is a task-artifact accounting measure, not a claim that35/45 of product acceptance is achieved.

## T046 owner-requested native identity rename — 2026-10-08

Owner supplied `tryweave.si` and requested both native package names change. Android applicationId/namespace and iOS Debug/Release bundle identifiers now use `si.tryweave`; authored Kotlin packages/codegen, test bundle IDs and callback configuration/docs were updated together. Existing S01–S20 behavior remains confirmed. This configuration-only rename introduces no new behavior and claims no behavioral RED.

Fresh verification: 81 mobile tests, 30 Android native tests, 31 iOS native tests, all four Android ABI build outputs, arm64/x86_64 iOS simulator app build, and root `npm run verify` passed. Actual APK/Info.plist/merged-manifest assertions verify both app identities and SDK callback registration values. See [native-identity.txt](evidence/native-identity.txt) for commands/results and local log references. Database behavior is unchanged; prior integration evidence remains historical. Live Clerk registration/accounts/device acceptance and required GitHub CI remain pending. No remote configuration or publishing performed. T046 complete: 36 of 46 tasks checked; the same 10 acceptance/follow-up tasks remain open.

## Clerk development configuration inspection — 2026-10-08

Owner authorized browser configuration and signed into the existing Weave application. Dashboard shows development only, with Native API, password, email-code and Google/shared credentials already enabled. No authentication policy change was needed. Captured only the publishable key, saved public values to ignored `apps/mobile/.env.local`, and rebuilt both native apps: Android assembleDebug exit0 / BUILD SUCCESSFUL in13s and iOS generic simulator build exit0 / BUILD SUCCEEDED. Actual generated Android BuildConfig and built iOS Info.plist match the captured public key; iOS retains `si.tryweave` / `si.tryweave://callback`. Logs: `/private/tmp/weave-clerk-configured-android.log`, `/private/tmp/weave-clerk-configured-ios.log`. No secret key accessed.

Android registration form is prepared with Digital Asset Links namespace `android_app`, package `si.tryweave`, and SHA-256 from the actual local debug APK (`apksigner verify --print-certs`); namespace here is the asset-link namespace, distinct from Gradle namespace. Native app/redirect registration awaits browser action-time confirmation; iOS also requires owner App ID Prefix. Existing owner fixture has verified email and password but no linked Google social account shown. No credentials were changed or users provisioned. These inspections/builds do not constitute live login/callback acceptance or production setup.

## Clerk development registrations completed — 2026-10-08

Owner confirmed the prepared access changes with `go haead`. Saved Android application registration in the existing Weave development instance: Digital Asset Links namespace `android_app`, package `si.tryweave`, and SHA-256 `CC:0C:B6:EE:D3:A2:95:7A:42:54:81:5C:63:07:E3:CE:8A:51:FA:F9:71:F9:30:64:64:0B:5C:D1:0B:B9:08:5E` from the local debug APK. Dashboard returned "Android app was created successfully" and displayed the saved row. It automatically added `clerk://si.tryweave.callback`; then saved `clerk://si.tryweave.oauth` and `si.tryweave://callback` explicitly. Final dashboard table displays all three. Screenshot: `/private/tmp/weave-clerk-development-configured.png`.

Native API/password/email-code/Google were already enabled; public key had already been saved locally and verified in both built native apps. No new source behavior was introduced, so no new behavioral RED or test result is claimed in this registration step. iOS native application registration remains deferred because the owner has no Apple developer account/App ID Prefix. Live login/logout/session/recovery and device acceptance remain unrun; no test user or password was created/changed. No production instance, DNS, signing, CI, commit or deployment changes performed.

## T047 owner-supplied branding — 2026-10-08

Authorization: “App logo and guidelines are available in /Users/pravinraj/Downloads/kit, Please update apps.” The supplied kit is the visual design. This is an asset/style update; existing S01–S20 behavior remains confirmed. No new authentication flow or fabricated behavioral RED is claimed. Masters, source attribution, font license and derivative details are retained in `assets/brand`.

Implemented: shared cream/olive/linen/terracotta/sage tokens, bundled Figtree fonts, supplied outlined horizontal logo on Login and web header, browser/favicon/Apple touch/manifest assets, all Android density launcher PNGs and adaptive vector layers, iPhone/iPad/store icon slots, and the centred iOS logo launch screen. Home still contains its existing Logout action only.

Actual verification:

- `npm test --workspace=@weave/mobile -- --watchman=false`: exit0, 81 tests /12 suites passed (`/private/tmp/weave-brand-mobile-tests.log`).
- `DATABASE_URL=<documented-local-sample> npm run verify`: exit0, lint/architecture/format/typecheck/policy and application tests, web production build and Android/iOS Metro bundles passed (`/private/tmp/weave-brand-verify.log`). Initial lint found the Metro asset declaration type-import/default-export boundary, corrected with a typed import and a narrow documented framework exception. The supplied manifest formatting was normalized after format check reported it. These tooling failures are not behavioral RED.
- Android `:app:assembleDebug`: exit0, all four ABI outputs compiled, BUILD SUCCESSFUL (`/private/tmp/weave-brand-android.log`). APK inspection confirms Figtree Regular/SemiBold/Bold, adaptive foreground and both adaptive launcher XMLs plus all legacy density icons.
- iOS generic simulator build: exit0, arm64/x86_64 build succeeded (`/private/tmp/weave-brand-ios.log`). Built Info.plist registers all three fonts, and Resources contains the font files, compiled icon and launch assets. No icon/font/logo compiler warning was found.
- Pillow inspection verifies every populated iPhone/iPad icon slot matches its pixel size and uses opaque RGB. Android legacy PNGs are opaque RGB. Original adaptive path extrema fit inside the 66dp circular safe zone. No rounded store icon or redrawn wordmark is used.
- Web production preview at localhost: cream `rgb(248,246,238)`, computed Figtree family, loaded supplied logo at 313.1875 × 99.921875 with preserved aspect ratio, accessible Weave heading/image, favicon/SVG/Apple-touch/manifest links. [Rendered preview](evidence/brand-web-preview.png). Backend is unavailable in this preview because the API is not started.
- iPhone17Pro /iOS26.2 unsigned build runs and renders the new font/cream/olive primitives, but stops before Login with the existing secure-storage failure state. Securityd reports `-34018`: missing application-identifier/keychain-access-groups entitlements in this compile-only build. [Observed state](evidence/brand-ios-storage-state.png). A copied temporary app with local ad-hoc entitlements had valid-on-disk signing but SpringBoard rejected launch. No production signing, Apple prefix, SDK authentication policy or source behavior was changed. Real signed device/provider acceptance and the native Login visual preview remain unverified under T043/T044.

Cosmetic verification is complete; original live authentication/device/CI convergence findings remain open.

### Xcode sign-in: native branding preview completed

Owner reported “btw I signed into Xcode.” The Xcode project now has owner-selected DEVELOPMENT_TEAM `44E9RE43KD`; preserved without rewriting it. No valid device codesigning identity was reported by the local identity query. Built using the existing native:ios command with trailing `CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=-` and the existing public configuration. Xcode-managed ad-hoc simulator build passed, generated `Weave.app-Simulated.xcent` with `application-identifier=44E9RE43KD.si.tryweave`, and installed/launched on iPhone17Pro iOS26.2. Metro was started before relaunch. The real startup Keychain health check succeeds and the branded Login screen renders: supplied outlined logo with clear space, Figtree headings/body/buttons, cream/olive palette and all three existing login choices. [Verified native preview](evidence/brand-ios-login.png). Build log: `/private/tmp/weave-xcode-signed-ios.log`.

This supersedes T047's unsigned-simulator preview limitation. The earlier manual post-build signature experiments were not equivalent to Xcode's generated simulator entitlements. No Keychain bypass, auth source change, fake login provider, paid membership claim, new certificate or device provisioning was used. Live sign-in/Google/email fixtures, minimum iOS17 runtime and remaining T043/T044 acceptance are still unverified. Clerk iOS registration is pending; the generated prefix is now available to prepare the entry.

### Clerk iOS registration verified — 2026-10-08

Owner completed the prepared form and reported “Added the iOS app.” Read-only dashboard verification confirms the Weave development instance's iOS Applications table contains App ID Prefix `44E9RE43KD` and Bundle ID `si.tryweave`. This matches the Xcode-generated `44E9RE43KD.si.tryweave` simulator identifier. Native API remains enabled and the existing three saved mobile callback URLs remain present. [Saved registration evidence](evidence/clerk-ios-registered.png). The agent did not submit another registration or change security/settings. Both development platform registrations are now configured; actual password/email-code/Google sign-in, lifecycle/accessibility and original T043/T044 acceptance remain unverified.

## Native E2E acceptance — 2026-10-08, in progress

Owner authorized both-platform acceptance and supplied an existing account identifier privately. Credentials are not stored in this evidence. Tests use the real configured Clerk development instance, Pixel 7 Android API 35 emulator and Xcode-signed iPhone 17 Pro iOS 26.2 simulator. Maestro 2.11.0 was downloaded from the official mobile-dev-inc release to `/private/tmp`; no product dependency added.

- S01 signed-out launch and S03 empty-input correction: PASS on both platforms. Login renders, Home/Logout absent, empty password/code forms show safe validation and method selection remains usable. Reports/screenshots: `evidence/native-e2e/{android,ios}-signed-out.{xml,png}`.
- S17 browser dismissal: PASS on both platforms using the real Google OAuth handoff. Closing the browser restores usable Login, Home/Logout absent, switching to email code succeeds. Reports/screenshots: `evidence/native-e2e/{android,ios}-google-cancel.{xml,png}`. Provider failure and interrupted/process-death callback cases remain unrun.
- The first baseline attempt failed only at the final screenshot path because Maestro requires screenshots inside its artifact folder. Corrected the runner path and reran successfully. This is a tooling error, not behavioral RED evidence.
- An initial manual iOS browser observation exceeded the planned 120-second Google foreground wait; safe timeout feedback appeared and Login remained usable. A later cancellation command therefore could not find the already-dismissed browser. The complete repeatable cancellation flow then passed. This is not evidence of successful Google authentication.

Commands: `JAVA_HOME=<JDK17> MAESTRO_CLI_NO_ANALYTICS=true MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true <temporary-maestro>/bin/maestro --device <device-id> test apps/mobile/e2e/flows/<flow>.yaml --format junit --output <report.xml> --test-output-dir <temporary-artifacts>`. Flows are `signed-out.yaml`, `google-cancel-android.yaml`, and `google-cancel-ios.yaml`.

Successful password/email-code/Google authentication, saved/revoked session acceptance, unknown identity account-count proof, device-trust/unsupported-verification fixtures, recovery fault injection, lifecycle/accessibility/timing and iOS 17 runtime acceptance remain pending. No open acceptance tasks are marked complete from these partial passes.

## Google consent branding follow-up — 2026-10-08

Owner requested Weave name and logo on the Google sign-in page. Read-only Clerk dashboard inspection confirms the Google connection currently uses shared credentials (`Use custom credentials` off); the native provider page displays Clerk. Owner signed into Google Cloud. Preparing the owner Google OAuth client/branding before linking custom credentials. No credential or shared sign-up policy changes applied yet. Clerk documentation: <https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google>. Google brand verification requirements: <https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification>.

Google OAuth project `tryweave-auth` (Weave) was created and verified in Google Cloud. Owner accepted Google's API Services User Data Policy. Google rejected the exact consent name `Weave`; the domain-qualified `Weave (tryweave.si)` was subsequently accepted and OAuth configuration creation was confirmed in the dashboard. Supplied `kit/png/weave-symbol.png` uploaded for logo; save verification and owner-client/Clerk linking are in progress.

E2E fixture investigation: `.invalid` identifiers are rejected by Clerk as invalid input and cannot establish unknown existing-account lookup. Replaced with documented non-delivering `wea10-unregistered+clerk_test@example.com`. iOS password and email-code unknown-account acceptance passed (native SDK; no mocked provider); Android repeat pending. Added non-sensitive `field-<label>` native input test identifiers for unambiguous selectors; no authentication behavior changed. Existing mobile regression: 81 tests / 12 suites passed after this metadata change. iOS keyboard Return is used instead of Maestro's gesture-based hideKeyboard, which triggered an unintended Google method tap in earlier test runs. These selector/fixture failures are not behavioral RED evidence.

S18 password/email-code unregistered-identity rejection passed on both native platforms: Android 63.581s total flow, iOS 18.32s total flow. These durations are whole-flow automation times, not SC-002 transition measurements. The final screenshots show safe existing-account feedback and no verification/Home. Reports/screenshots retained as `evidence/native-e2e/{android,ios}-unregistered.{xml,png}`. iOS report references the temporary flow used before copying the same public steps into the repository; Android uses the repository flow. Provider user-count/Google unknown-account proof remains pending.

Google branding Save confirmed by dashboard toast `Branding changes saved.` with the current supplied logo and `Weave (tryweave.si)`. Exact Clerk authorized redirect read from the unsaved custom-credential draft: `https://balanced-mutt-649.clerk.accounts.dev/v1/oauth_callback`. Current scopes remain openid/email/profile. No OAuth credential entered/saved; Google client creation page failed to load after its Retry action; checking the alternate Credentials interface.

Alternate APIs and services → Credentials → OAuth client ID opened successfully. Prepared Web application draft `Weave Clerk development`, only the exact Clerk authorized redirect, no JavaScript origins and no AI-agent option. Owner handoff requested for final client creation and new credential entry/submission into Clerk under the browser tool credential policy. No secret captured. Repeatable native flow prerequisites and privacy limitations documented in `apps/mobile/e2e/README.md`.

Clerk development user inventory verified after both native S18 password/code flows: 2 users, unchanged from the pre-test count. Search for the unregistered fixture returned `No users found`; sanitized dashboard proof retained as `evidence/native-e2e/unregistered-provider-search.png`. This proves no account was created by these password/email-code runs; Google unknown-account acceptance remains unrun.

Fresh mobile ESLint and TypeScript checks passed after the public test-ID/flow additions (`/private/tmp/weave-mobile-e2e-{lint,types}.log`); `git diff --check` passed. Mobile behavioral regression remains the fresh 81-test pass recorded above. No new auth behavior change or behavioral RED claimed. Google client draft and Clerk credential form remain open for owner entry; successful branded native Google login and the full acceptance suite remain pending.

Physical Android startup — 2026-10-08: owner connected OnePlus 11R 5G / CPH2487 / Android16. ADB initially omitted the phone, later reported it authorized. Streamed/compressed transfer attempts failed; explicit uncompressed push completed (153443387 bytes), and device `pm install -r` returned Success. Weave initially showed unable-to-load-script feedback before USB forwarding. Verified Metro status running and `reverse tcp:8081 tcp:8081`, force-stopped only `si.tryweave`, then cold launch returned Status ok (800ms native launch measurement, not SC-002 auth timing). Captured screen verifies branded Login with password, email-code and Google methods and empty input fields. `evidence/native-e2e/android-physical-login.png`. S01 signed-out startup only; no physical successful login/full E2E claim. Keep Metro and USB forwarding available for this development build.

Google client creation verified after owner said `created`: modal heading `OAuth client created`. Agent checked only headings/input-presence booleans; did not read/copy/store new client secret. Clerk still shows unsaved changes and empty client-ID/secret inputs. Owner instructed to complete credential entry and Save. Branded Google sign-in remains unverified.

## T049 approved Login/OTP refinement — 2026-10-08

Owner said “approved” after the web-aligned mobile proposal; `workflow.json` records the scope, happy/sad/edge examples and public seams before source changes. Compact proportional Weave lockups, Figtree hierarchy, outlined official Google action, accessible selected method tabs, focused soft fields, reusable button/feedback variants and six visual code slots now compose Login. One real native input owns normalization, editing, keyboard and one-time-code hints. Provider validation, account policy, session/controller/native APIs, routes and Home remain as specified.

Actual RED/GREEN and correction evidence lives in `evidence/login-ux`:

- Initial meaningful component RED: 3 missing UX behaviors failed while 9 original Login cases passed — selected-method state, formatted six-digit insertion, and native code-autofill/keyboard hints. Watchman/test-matcher setup failures were corrected before the retained behavioral RED; they are not claimed as behavioral evidence.
- Android native rendering RED: the actual platform screenshot showed the input's full string overlapping passive slots. Installed RN0.86.3 `graphics/Color.h` treats `HostPlatformColor::UndefinedColor` as unset; Android defines it as zero, the same representation as transparent black. `attributedstring/conversions.h` omits that foreground colour. Transparent white has zero alpha with nonzero RGB, so it survives the text-attribute boundary; the repeated native screenshot shows each digit only once. No renderer patch, new library or opacity-based accessibility exclusion was introduced.
- Scoped code review found that visual focus derived from code length could disagree with native selection. Two meaningful correction tests failed with linen focus on moved/range-selected middle digits instead of sage, then passed after observing native selection and drawing the corresponding range/caret. The original hidden-slot query and RN Jest preset's fontScale2 fixture mistakes were fixed before retaining this RED. Native editing remains unrestricted; no append-only cursor lock was added. Reviewer rechecked the correction and found no further actionable scoped issue.
- Fresh component regression after correction: 86 tests /13 suites passed; native renderer privacy probe passed. TypeScript passed. Raw sanitized outputs: `component-red.txt`, `selection-red.txt`, `component-green.txt`.
- Final iOS26.2 native UI fixture: passed36s after cursor correction. It renders real App/Login/CodeField with a deterministic public controller seam, uses fictional `preview@example.com`, and returns only challenge or invalid-code outcomes. Formatted input, explicit Verify, pending/error, Resend and return to password Login are exercised. Screenshots show the numeric keyboard, inputs and reachable actions.
- iOS enlarged text: accessibility-large passed44s; real single-field fallback accepts the code, drag dismisses the keyboard, and scrolling reaches Verify and invalid-code feedback. The first large-text flow hit a keyboard key because Maestro counted a button behind the keyboard as visible; corrected gesture/scroll flow passed. This test-tool obstruction is not a product behavioral RED. Simulator text size restored to its original `large`.

The temporary runner restores the original production `index.ts` in `finally`, then relaunches the Clerk-backed app; the fixture never creates an active session or account. Harness source, flows, clean JUnit results and fictional-input screenshots are retained for provenance. These prove presentation/interaction; delivered-code autofill, successful real credentials, provider sessions and all S01–S20 acceptance are not inferred. The OnePlus was locked, then disconnected during these checks; original T043/T044 real-provider/accessibility/lifecycle gates and T048 custom Google credentials remain open. Final Android keyboard/scaling and repository verification results follow.

Fresh full repository verification after the review correction passed: `DATABASE_URL=<documented-local-sample> npm run verify` exited0. Lint, architecture/dependency injection, formatting, TypeScript, policy/application tests (including 86 mobile tests), web production build and both production Metro bundles passed. Retained output: `evidence/login-ux/repository-verify.txt`. The first run found only a retained YAML formatting mismatch; formatted it and reran the complete command successfully. No new database integration or remote CI execution is claimed for this UI slice.

Final Android API35 UI fixture passed80s after the selection correction, with actual native numeric keyboard visible, formatted six-digit input, pending/error, Resend and return to password Login. FontScale1.6 fixture passed71s: the single-input fallback remains readable and scrolling reaches Verify and error feedback. Retained reports `android-ui.xml` / `android-enlarged.xml` show zero failures, with corresponding keyboard/error screenshots. Earlier offline-driver retries and a Watchman socket crash prevented test execution or caused the cached real-provider app to run; those are tooling failures, not product RED. A temporary Metro config outside the repository uses its Node filesystem watcher. Production Metro configuration remains unchanged.

After both successful Android runs, the original `index.ts` was restored, fontScale returned to1.0, stylus handwriting returned to its original unset value and software-keyboard preference returned to1. The real Clerk-backed app relaunched. The harness now propagates Maestro's exit code after restoration as well as retaining JUnit results. T049 is complete for its approved presentation scope. Physical-device replay remains unavailable while the phone is disconnected; no successful real-account login or full feature completion is claimed.

## T050/T051 owner-requested interaction correction — 2026-10-08

Owner requested that method switches move only the changing fields with animation, and that the last OTP digit verify automatically. The explicit instructions authorize the bounded S03/S08/S15/S16/S19 examples recorded before source changes in workflow.json. T051 supersedes T049's explicit-submit behavior; no provider/account policy changes were made.

The Login header/Google/tabs/email now stay anchored while the measured password row fades/collapses and submit action moves locally over220ms. The expanded region reserves space, and Login retains peak content extent so removing password or feedback cannot clamp scroll offset. Viewport/challenge changes reset that extent. Hidden password input is excluded from focus/accessibility. Reduce Motion stops active animation and snaps to the current method; rapid switching cancels prior transitions.

Normalized six-digit insertion now dismisses the keyboard and immediately calls the existing controller verification boundary. Partial codes remain editable; pending guards suppress duplicate requests. Submitted code clears promptly, and invalid feedback permits a new automatic attempt for both sign-in and device-trust challenges.

Actual RED→GREEN and verification:

- Native pre-fix Android method switching moved every shared control132px (`native-layout-red.txt`). Final bounds are identical in both directions (`native-layout-green.txt`), and the native recording shows local field/action motion.
- Two new real LoginScreen boundary tests failed because complete code insertion made zero verification requests (`auto-code-red.txt`). They now verify once for both code purposes, ignore pending duplicates, and automatically retry corrected input after rejection.
- Review identified scroll clamping from collapsed password and removed feedback. A meaningful ScrollView boundary RED discarded the previous1800px extent (`scroll-extent-red.txt`). Both corrections pass; final scoped review has no remaining actionable issues (`review.txt`).
- Final production entry/source: full `npm run verify` exited0, including89 mobile tests in13 suites, lint/architecture/format/types, policy/application tests, web production and both Metro bundles (`repository-verify.txt`). No new database integration or remote CI is claimed.
- Actual native deterministic UI flows passed on Android API35 (69s) and iOS26.2 (29s), typing five digits then the sixth without tapping Verify. Screenshots show partial input/native keyboard, automatic pending/disabled state with keyboard dismissed, invalid feedback, Resend and password return. JUnit reports have zero failures. Android fontScale1.6, Reduce Motion and rapid switching also passed.

Retained harness, reports, screenshots, bounds and recording: [interaction evidence](evidence/login-interactions/README.md). Temporary fixtures return only challenge/error outcomes and restore the production entry/preferences in finally; no successful provider authentication is inferred. Early startup/selector/scroll obstruction and transient-status timing failures are tooling observations, not behavioral RED. Physical phone replay was unavailable because it is disconnected. Original full-provider/session/storage/lifecycle/accessibility/iOS17/CI and custom Google-branding tasks remain open. T050/T051 are complete within this requested interaction scope.

Final iOS accessibility-large interaction flow also passed in1minute: the sixth digit reaches invalid-code feedback automatically without a Verify tap; Resend and password return pass. Retained `ios-enlarged.xml` has zero failures, with screenshots. Shared method-control positions are visually identical; scrolling had dismissed the keyboard before those stationary screenshots. The production entry and original text size were restored.

## Owner-saved custom Google credentials — 2026-10-08

Owner completed the credential-entry/submission handoff and reported “done”. Read-only Clerk development connection verification finds Use custom credentials enabled, both credential fields populated, no Unsaved changes, and public Client ID matching the Google Cloud `Weave Clerk development` client. Only booleans/match results are retained; credential values are excluded from logs/artifacts. Screenshot `evidence/clerk-google-custom-saved.jpg` includes the connection state and deliberately excludes credential fields.

This resolves the previous missing credential linking prerequisite. The Google consent name/logo still need actual native handoff verification, and successful existing-account Google authentication on both platforms remains pending within T048/T043. Computer Use reads the Device Hub iPhone17Pro simulator display but click attempts fail because no controllable window is available; owner was asked to open the Google handoff manually. No source, credential or policy mutation was performed by the agent in this verification step.

## Google domain-only consent display investigated — 2026-10-08

Owner supplied a Google sign-in screenshot showing `accounts.dev` with no app logo and authorized `Weave App` if `Weave` is rejected. The Google project already has the correct supplied Weave symbol uploaded, confirmed visually. Saving `Weave` returned the app-name noncompliance error; saving `Weave App` returned the same error. Failed edits were discarded, leaving the last accepted saved name `Weave (tryweave.si)`. No replacement name was invented. Evidence: `google-weave-app-rejected.jpg`, `google-saved-brand-logo.jpg`, and `google-domain-only-owner.png`.

Root-cause evidence: the Clerk connection is a development instance using an accounts.dev callback; Google is External/Testing, and its Verification centre explicitly says verification is not required in Testing and exposes no verification action. Branding homepage/privacy-policy/Terms URLs are empty. Browser inspection finds https://tryweave.si/ is a Hostinger parked-domain page, rather than a Weave homepage. The web read tool could not access that URL; browser inspection succeeded, so that tooling error is not evidence of site unavailability.

Official [Google branding guidance](https://support.google.com/cloud/answer/15549049?hl=en) states the app name/logo must be verified and that an unverified brand shows only its domain. Official [Clerk environment guidance](https://clerk.com/docs/guides/development/managing-environments) explicitly describes accounts.dev consent display for development. The saved upload/client linking does not establish published brand approval. Screenshot: `google-testing-verification.jpg`.

Remaining prerequisites: public Weave homepage/privacy policy and verified domain; corresponding production Clerk/Google configuration and brand approval/publication; fresh native branded handoff/login acceptance. Owner was asked for existing public page URLs. No audience expansion, production switch, DNS change, account policy change, credential replacement, deployment or successful provider login is claimed. T048 remains unchecked; local source/test results are unchanged.

Owner confirmed public-site/policy prerequisites do not exist yet: “No we are just getting started and we dont have anything.” This is the concrete remaining prerequisite for the verified public branding setup; no fictitious URL or policy was entered, and the existing development configuration remains saved.

## T052 — shared Login/OTP header (2026-10-09)

Owner directly requested a consistent centered logo on both pages and Back at the top. Scope and happy/sad/edge checks were recorded in workflow.json before source changes. AuthHeader now sits inside the top safe area, above the keyboard-aware scroll region; identical logo sizing and symmetric navigation slots preserve its position. Back retains the controller method-return/pending contract.

RED: `npm run test --workspace=@weave/mobile -- --watchman=false --runTestsByPath src/auth/login.test.tsx` failed exactly the two new signIn/deviceTrust header regressions: Weave was still inside ScrollView (expected null, received image). The initial sandbox Watchman failure and corrected image-query harness are not behavioral RED. GREEN: `npm run test --workspace=@weave/mobile -- --watchman=false` passed91 tests/13 suites, including both pending Back guards, rejected-code return, stable method transition and automatic OTP regressions. Actual logs: [RED](evidence/auth-header/regression-red.txt), [GREEN](evidence/auth-header/mobile-green.txt).

Android API35 and iPhone17Pro/iOS26.2 deterministic presentation flows passed at normal text sizes (38s/25s). iOS accessibility-large also passed (52s), including automatic code rejection, resend and top Back while the form scrolls. Captures use preview@example.com and the injected gateway, not a real Clerk session. The transactional runner restored production index.ts, original text-size/keyboard preferences and relaunched the real app. A harmless iOS terminate found-no-process message was followed by successful launch.

Native pixel bounds across Login/password, Login/email-code, OTP/keyboard, rejection and return are identical and centered (Android1080px: x372–707/y187–293; iOS1206px: x411–794/y244–365). The same iOS bounds hold at accessibility-large. Maestro logs also place the normal iOS Back target at x24/y78 with48×48 points inside the safe area. Fixtures/flows/checker, JUnit results and credential-free screenshots are retained in [auth-header](evidence/auth-header/). This evidence covers presentation and deterministic controller behavior; full real-provider, lifecycle, storage observability, minimum-iOS17 and CI gates remain open.

Android fontScale1.6 also passed the enlarged-text automatic-code/error/resend/Back flow; logo bounds remain identical to normal text. Original fontScale1.0 and keyboard settings restored.

Final `DATABASE_URL='postgresql://weave:weave_local@localhost:5432/weave?schema=public' npm run verify` exited0: lint/architecture, formatting, strict types, policy/application/mobile tests (91/13), web production build and both production Metro bundles. The documented development URL permits Prisma generation; no database integration run is claimed. Source entry remained production during this run. Android enlarged initial capture preceded the default image fade completion; the four later fully rendered states (including returned Login) have the same centered bounds. The retained bounds report explicitly identifies that initial capture. No provider, signup/invitation policy or Apple login behavior was changed.

Owner requested iPad launch: reused already-booted iPad Pro13-inch(M5)/iPadOS26.2, installed the existing universal simulator Weave.app, and launched production si.tryweave (PID98361). Current Login rendered with centered header and constrained form, captured in `evidence/auth-header/ipad-current-login.png`. Xcode27 supplies Device Hub rather than a standalone Simulator.app; Device Hub confirms the selected iPad, visible Login controls and raised window. This launch/visual check does not claim iPad authentication acceptance.

## T053 — tablet Login/OTP alignment (2026-10-09)

The owner reported the iPad Login/OTP vertical inconsistency. Inspection confirmed Login overrides scroll alignment to flex-start while OTP retains center, creating a large displacement on taller viewports. Shared header-only T052 did not address this form alignment. The correction uses one centered bounded tablet frame, one shared top form origin and removes the OTP-only decorative icon offset. Phones/narrow windows keep a full-size frame.

RED: `npm run test --workspace=@weave/mobile -- --watchman=false --runTestsByPath src/auth/login.test.tsx` fails exactly two new code-purpose regressions: expected Login alignment flex-start, received OTP center. GREEN: full mobile command with `--watchman=false` passes93 tests/13 suites. Existing automatic-code, pending Back, method transition and scroll-extent coverage remains green. See `evidence/tablet-alignment/regression-red.txt` and `mobile-green.txt`.

Actual iPad Pro13-inch(M5)/iPadOS26.2 flows pass in portrait27s, landscape28s and accessibility-large38s. Both normal orientations have identical native logo and heading origins across password Login, email-code Login, OTP, invalid-code feedback and return. Portrait: logo y688–769, first heading ink y872. Landscape: logo y344–425, heading y528. The measurement reads PNG orientation metadata before comparing pixels. The large-text flow scrolls to inputs/error/resend and returns via Back successfully. Orientation and text size restored. The deterministic gateway only supplies challenge/error results; production source is restored by the runner. No real-provider acceptance is claimed.

T053 final checks: iPhone normal flow passes26s and Android normal flow passes53s. `DATABASE_URL='<documented local development URL>' npm run verify` exits0: lint/architecture, format, strict types, policy/application tests,93 mobile tests/13 suites, web production and both Metro builds. No database integration or remote CI run is claimed. Production entry verified and real Clerk-backed apps cold-launched after all temporary fixtures; final iPad screenshot retained as `ipad-production-login.png`.

## T054 — responsive authentication composition (2026-10-09)

Owner requested phone forms near the top, portrait tablet centering, and a web-like landscape split. `AuthLayout` uses the shorter dimension to avoid classifying a rotated phone as a tablet. Wide landscape tablets render generated decorative bag artwork beside the shared authentication frame. Original kit interface logos and existing authentication contracts remain intact. The owner then identified the bottom cream strip: the outer safe-area inset caused it. Artwork now paints to the edge while form controls and artwork copy retain safe-area protection.

Actual RED logs cover the missing landscape composition and the artwork incorrectly inside the form safe area. Final GREEN passes94 mobile tests/13 suites, including preservation of email and partial OTP across rotation. Full root verify exits0 with documented development DATABASE_URL (lint/architecture/format/types/tests/web/both Metro bundles). No database integration or CI claim. Normal landscape native flow passes31s; final iPhone flow passes29s. Enlarged-text landscape automation did not complete: default scrolling missed the right pane, and subsequent coordinate gestures affected iPad windowing. Failed runs are retained, not claimed as successful accessibility evidence. See [responsive evidence](evidence/responsive-auth/README.md).

## iPad simulator orientation diagnosis — 2026-10-09

Owner reported portrait unavailable. Installed Info.plist explicitly supports all four iPad orientations. Device Hub Rotate Right changed the device frame to portrait while the rendered iPadOS status bar and Weave remained landscape; Home also remained landscape, isolating the symptom outside the app. No active Maestro/XCTest runner or explicit rotation-lock preference was found in the checked process/preferences output. Restart alone initially retained the stale landscape interface; after test-driver initialization and subsequent Device Hub rotation, iPadOS and the frame synchronized again. The exact triggering simulator subsystem is unconfirmed; no rotation-lock toggle or app source change was made.

Visually verified portrait → landscape (artwork/tagline appears) → upright portrait (artwork/tagline removed; centered form) through Device Hub. Left the real app in upright portrait, full window. Final native capture: `evidence/responsive-auth/ipad-portrait-restored.png`. This resolves the observed simulator portrait issue without claiming the previously incomplete enlarged-text interaction check passed.

## iPhone orientation verification — 2026-10-09

Owner requested the same check on mobile iOS. On iPhone17Pro/iOS26.2 the current real app renders the complete top-aligned Login form in portrait. The installed app's UISupportedInterfaceOrientations contains only UIInterfaceOrientationPortrait. Rotating the simulator sideways therefore retains the portrait interface, matching its current native configuration; this is different from the iPad simulator's earlier system-wide stale orientation. Restored the device upright and visually verified the full form. No source/configuration change or new authentication acceptance run was performed.

## Publication validation — 2026-10-09

Owner requested commit and PR. Integrated develop `810974c`, retaining web authentication and the approved pnpm 11.1.1 migration. Frozen install, full repository verification, 3 database integration checks, Android native contracts/build and iOS simulator build/31 host contracts passed. Local database is PostgreSQL18; PostgreSQL17 CI and code-owner review remain pending. Results: [publication evidence](evidence/publication/summary.txt). Existing F1–F4, T048 and T054 acceptance gaps remain open; draft publication does not imply full-ticket completion.
