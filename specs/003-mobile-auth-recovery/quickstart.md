# WEA-10 mobile validation guide

Authentication implementation is present. This guide distinguishes automated contract checks from live/device acceptance; see evidence.md for actual outcomes. See [authentication contract](contracts/authentication.md), [test map](contracts/scenario-tests.md), and [data model](data-model.md).

## Prerequisites

- Use a WEA-10 ticket branch from develop before source edits, preserving this feature's artifacts. T001 verified remote develop at 27698fb1a257259e12946e1526e57b1c6fc58836 and created feat/WEA-10/mobile-auth-recovery; unrelated unmerged WEA-8 work was excluded.
- Confirm S01–S20 in workflow.json before source implementation; method/registration answers do not themselves confirm the full scenario set.
- Use Node matching repository .nvmrc, npm 11.19.0, the hoisted root workspace install, existing Android/iOS projects and Community CLI.
- Provide the same environment's Clerk application as the web owner. Owner enables Native API, email/password and email-code sign-in, and Google, and registers native application/callback configuration. Do not change shared signup settings or provision credentials implicitly.
- Have existing test accounts with password, verified email and Google eligibility, plus an unregistered test identity. For S19/S20, use existing owner-provided accounts requiring email device verification or unsupported MFA/session tasks; do not modify remote policies or provision accounts implicitly. Missing fixtures remain blocked live checks. No secret values in logs, screenshots or evidence.
- Android: JDK 17, SDK/build tools 36, NDK 27.1.12297006, emulator/device and local development signing per apps/mobile/README.md.
- iOS: iOS 17+ simulator/device, full Xcode with Swift 6.2 support for ClerkKit 1.6.0, Ruby 3.3 and Bundler 2.5.22. User approved the iOS 17+ minimum; update app/test targets and Podfile consistently during implementation and verify the actual CI toolchain. Command Line Tools alone are insufficient.

## Configuration contract

Owner confirmed `tryweave.si` as Weave's domain on 2026-10-08. Use it when configuring the shared Clerk production instance. Add the exact DNS records shown in that instance's Clerk Dashboard Domains page; the domain confirmation does not establish that DNS, certificates or the production instance are configured. Follow the [official production checklist](https://clerk.com/docs/guides/development/deployment/production). Development acceptance can continue with the same environment's `pk_test_` key while production setup is pending. Owner subsequently requested both native package names change: Android and iOS now use reverse-domain `si.tryweave`. Register Android callbacks `clerk://si.tryweave.callback` / `clerk://si.tryweave.oauth` and the default iOS callback `si.tryweave://callback` in Clerk before live acceptance. Android development registration and all three redirect URLs were saved/verified in Clerk on 2026-10-08; iOS native application registration remains deferred pending App ID Prefix.

Use the exact native build settings described in [mobile README](../../apps/mobile/README.md). iOS custom schemes use SDK-owned OAuth callbacks and need no associated-domain entitlement; associated domains are required only if separately adopting universal links.

Use `CLERK_PUBLISHABLE_KEY` as the environment-supplied public configuration input; native resources/composition expose the selected value to bootstrap without relying on Node's process.env at mobile runtime. Native callback schemes derive from registered package/bundle identity. Keep server secret keys out of both native resources and JavaScript. Missing config still allows app mounting into fail-closed actionable feedback. Actual Android BuildConfig and iOS Info.plist/Xcode injection are documented in apps/mobile/README.md. The .env.example documents public values; no dotenv loader is installed.

Public publishable keys and callback IDs may be supplied at native build time. No container release/promotion behavior changes. If native runtime switching is required later, its trusted delivery mechanism needs a separate design; do not silently invent an unauthenticated remote config endpoint.

## Install and launch

From the repository root:

```sh
npm ci
npm run dev --workspace=@weave/mobile
```

In another terminal choose a platform:

```sh
npm run android --workspace=@weave/mobile
npm run ios --workspace=@weave/mobile
```

For iOS native dependencies after authored dependency adoption:

```sh
cd apps/mobile
bundle install
cd ios
bundle exec pod install
```

ClerkKit uses Swift Package Manager; resolve and commit its Package.resolved through Xcode; CocoaPods locking alone does not lock Swift packages. CI must resolve committed Swift package versions without silently updating them.

## Automated validation

Commands below exist; feature tests run through the mobile suite. Unit tests use controlled gateways and no live credentials.

```sh
npm test --workspace=@weave/mobile
npm run lint --workspace=@weave/mobile
npm run typecheck --workspace=@weave/mobile
npm run build --workspace=@weave/mobile
npm run test:native:android --workspace=@weave/mobile
npm run test:native:ios --workspace=@weave/mobile
npm run test:native:ios:host --workspace=@weave/mobile
npm run native:android --workspace=@weave/mobile
npm run native:ios --workspace=@weave/mobile
npm run verify
```

T008 adds test:native:android and test:native:ios scripts and invokes them in required mobile-native CI jobs. Run both scripts locally and in CI; the iOS test command must select a runnable simulator rather than the generic build destination. Native contract failures must fail CI, and test results must be retained. T038 records actual outcomes; CI checks not executed remain unrun.

Before PR, run the repository database integration prerequisite even though this slice changes no schema:

```sh
npm run db:up
npm run db:generate
npm run db:deploy
npm run build --workspace=@weave/api
npm run build --workspace=@weave/web
npm run test:integration
```

Use the existing documented DATABASE_URL and local services. Record exact environment and outputs in evidence.md. Do not invoke root verify merely to test planning documents. S01–S20 agreement was recorded before source implementation.

## End-to-end acceptance matrix

1. Signed-out launch shows Login alone. Existing accounts reach Home through each of password, delivered email code, and Google. Home has Logout as its only interactive action. Back cannot return to Login after authentication.
2. Wrong/malformed credentials, unknown accounts, expired/invalid codes, resend throttling, Google dismissal/provider failure and offline requests leave Login usable and never unlock Home. Observe unknown-user account count before/after with owner-approved read-only inspection: zero new accounts for every method.
3. Exercise S19 password-triggered email device verification: valid code completes authentication; invalid/expired code and resend throttling leave Home unavailable. Exercise S20 unsupported verification: clear feedback, usable return to methods, no policy bypass. Use native contract fixtures plus existing owner-provided live accounts; record missing live prerequisites explicitly.
4. Force-close and reopen with active/absent/expired sessions. Verify session loading hides both routes until resolved. Revoke a test session externally, foreground the app and verify Home is removed.
5. Logout, rapidly tap Logout, simulate logout failure, then use Back and reopen. Verify actual provider/local outcome and no false success.
6. Testing-build fault injection in Login, Home, root authentication and navigation renders shows a safe Reload screen. Transient fault + Reload returns to the current valid route; persistent fault shows fallback again without a loop. No production fault trigger is shipped.
7. Test Android activity recreation and iOS/Android cold/warm OAuth callback delivery, unrelated/forged/stale callbacks and process death during Google handoff. Callback URLs never act as Home authorization.
8. VoiceOver/TalkBack, enlarged text, keyboard reachability, safe areas and token contrast checks cover all states. Device checks supplement simulated component assertions.
9. With seeded credential values, inspect captured app/SDK diagnostic output and platform persistence behavior: no secrets/raw stacks and no plaintext credential cache. Test read/write/clear failure paths at the gateway seam.

All S01–S20 outcomes and the extra risk checks in the [mapping](contracts/scenario-tests.md) need evidence. Native compile success alone does not establish end-to-end correctness. Keep overall Linear ticket open until its separate web/signup/invitation criteria are addressed; do not report this mobile slice as whole-ticket completion.

## Current native configuration — 2026-10-08

Both development platform registrations and all three callback URLs are saved in Clerk. iOS App ID Prefix is `44E9RE43KD`, bundle ID `si.tryweave`; Android package is `si.tryweave` with the verified local debug certificate. The owner signed into Xcode, and Xcode-managed ad-hoc simulator signing generates application identifier `44E9RE43KD.si.tryweave`. The real startup Keychain check passes and Login renders on iPhone17Pro/iOS26.2. Run Metro before launching; see apps/mobile/README.md for the signed local build override. Paid membership/device provisioning and minimum iOS17 runtime are unverified. Live provider/scenario acceptance is being executed separately; registration/build success is not login acceptance.
