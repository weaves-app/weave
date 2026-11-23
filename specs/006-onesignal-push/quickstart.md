# Validation Guide: WEA-29

Code and automated verification are complete on `feat/WEA-29/onesignal-push`, stacked on PR #13 (`75814ad85894460ddeae46c9aa337f0d09463f5c`). S01–S11 were confirmed. The user requested code completion and documentation while provider/device setup is unavailable. Automated evidence is in [evidence.md](evidence.md); no live delivery is claimed.

## Prerequisites

1. Use the approved PR #13 stack and the active `specs/006-onesignal-push` feature. The baseline, scenario agreement and pre-implementation analysis are recorded in workflow.json.
2. Use repository Node >=22.12, pnpm 11.1.1, supported Java/Android SDK, Xcode and CocoaPods. Resolve existing native tooling from the baseline; preserve locked dependencies and local credentials.
3. Configure a controlled OneSignal mobile app with APNs/FCM, Identity Verification beta access and a key held only by the API. Confirm no unsigned/web client will be broken by the app-wide toggle. Configure matching public app IDs, fixed HTTPS API origin and Clerk environment. Use secure environment configuration, never committed values. No notification-sending key belongs in the mobile build or API readiness component.
4. Have two controlled accounts and two suitable installations, including real Android and iOS delivery capability. Record provisioning/signing limitations. A simulator compile is not physical-device delivery acceptance.

## Locked dependencies

The following exact versions have been adopted; these commands document the adoption and should not be rerun for ordinary setup:

```sh
pnpm --filter @weave/mobile add --save-exact react-native-onesignal@5.5.15
pnpm --filter @weave/api add --save-exact @clerk/backend@3.23.0 jose@6.2.12
```

Resolve native Pods/Gradle through the existing project's scripts and location-disabled configuration, commit relevant lock changes, and inspect the dependency diff. Do not remove/reinstall the workspace or upgrade unrelated auth/native dependencies to make planning checks pass. The native bridge/codegen and provider setup described in contracts must exist before these dependencies provide working delivery.

## Automated and build verification

Run targeted tests per RED/GREEN slice first. After implementation and required setup, existing baseline commands are:

```sh
pnpm --filter @weave/mobile test
pnpm --filter @weave/api test
pnpm --filter @weave/mobile run test:native:android
pnpm --filter @weave/mobile run test:native:ios
pnpm --filter @weave/mobile run test:native:ios:host
pnpm --filter @weave/mobile run bundle:android
pnpm --filter @weave/mobile run bundle:ios
pnpm --filter @weave/mobile run native:android
pnpm --filter @weave/mobile run native:ios
pnpm run db:up
pnpm run db:deploy
pnpm run test:integration
pnpm run verify
```

Use an isolated test database; `db:deploy` applies only committed migrations. The integration glob includes notification budget contention/expiry and configured compiled-runtime tests. API tests build before execution and require `DATABASE_URL` for Prisma generation. Both endpoint paths and jose are exercised in compiled production modules. Native scripts discover notification tests alongside existing auth tests.

Consult the evidence ledger for commands actually executed and their outcomes. Toolchain/import failures do not count as behavioral RED. Full verify is required before a PR, with external/native/device gaps explicitly open. In a sandbox where Watchman is unavailable, invoke Jest with `--watchman=false`; do not treat Watchman access errors as test failures.

## Controlled end-to-end journey

- Start signed out, launch/Reload/foreground repeatedly: no permission prompt, no ready and no push-induced authentication changes.
- Sign into A. Choose Enable on Home, allow permission and observe pending until authenticated backend verification confirms the exact subscription. Repeat denial, settings recovery and unavailable configuration. Automatic activation/Retry never prompts.
- Send a generic plain test notification from the controlled provider dashboard to A, observing foreground/background/normal terminated presentation on each platform. Capture actual receipt, not only send acceptance. No business-trigger endpoint is added.
- Tap cold/warm notifications and repeat missing/malformed/duplicate/external Launch URL cases. Verify only ordinary Login/Home/recovery, no browser, account change or business mutation. Normal auth gate remains authoritative.
- Switch A→B and sign out offline/online. Ready clears immediately; ordinary sign-out completes. After provider-observed eligibility change, new A-targeted sends exclude that installation and B-targeted sends reach the enabled B installation. A's second installation remains eligible. Separately record any already queued OS notification.
- Pause native token acquisition, grant/verification responses and provider observers while switching account or reloading. Resume: no old context can rebind through a follow-up or show ready. Revoke permission/rotate subscription/expire confirmation and verify ready clears. Return to foreground for one bounded recheck.
- Exercise grants at 14/15/16 seconds remaining, delayed bridge events with deliberately different native/JS clock origins, duplicate ready events and native responses just below/at/above 16 KiB. No refresh loop or duplicate event may extend readiness.
- Exercise backend 401/429/503, malformed provider data and multiple API instances. Never show ready from local state, stale cache or a different subscription. No queue/poll flood; Retry becomes available after bounded guidance.
- Inspect English inventory, reachable enlarged-text controls, VoiceOver/TalkBack announcements, location exclusion and sanitized logs. No secrets or private business content in screenshots/evidence.

Use [scenario contracts](contracts/scenarios.md) for coverage and [backend contract](contracts/backend.md) for authentication/field/failure matrices. Record actual outcomes in evidence; leave unperformed checks open. Then run speckit-converge, review all changes, and prepare a ticket-matching PR with spec/evidence links and personal author/committer verification. No production sends or deployment are part of this validation guide.

## Request-budget maintenance

`pnpm --filter @weave/api run notifications:cleanup` performs one database-time sweep of at most 100 expired account rows, with the same shared once-per-60-seconds limit as opportunistic cleanup. It emits aggregate counts only and exits; it creates no scheduled job. Account expiry is nextAllowedAt + 24 hours, global rows never expire, and concurrent cooldown updates must survive cleanup. With no activity, expired rows remain until a later sweep; repeat the command in a controlled maintenance session only after its cooldown. Verify these limits against the isolated test database before using the command operationally.

## Remaining controlled-environment setup

This setup has **not** been performed. Keep delivery acceptance open until every applicable step is verified in a controlled environment.

1. Create/select an isolated OneSignal mobile app and confirm Token Identity Verification availability and app-wide compatibility before enabling it. Configure the matching ES256 verification key. Store the private signing key only in API secret configuration. Keep provider remote diagnostic logging disabled; SDK console/alert logging being disabled does not disable the provider's remote log sink.
2. Configure APNs credentials, the actual iOS bundle identifier and push entitlement/signing profile; configure FCM and the matching Android application. Use the public app ID for that same environment. No notification-sending API key is required by this feature.
3. Supply API configuration from the [backend configuration table](evidence/backend.md#environment-setup-and-remaining-acceptance): `DATABASE_URL`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLERK_EXPECTED_ISSUER`, `CLERK_JWT_KEY`, optional `CLERK_ALLOWED_ORIGINS`/`CLERK_AUDIENCE`, `ONESIGNAL_APP_ID`, `ONESIGNAL_IDENTITY_PRIVATE_KEY`, `NOTIFICATION_BUDGET_HMAC_KEY`. Native and API must use the same Clerk instance. `CLERK_JWT_KEY` is a trusted public PEM; update it when Clerk rotates keys. Apply the committed database migration only to an authorized target.
4. Supply public mobile build settings `ONESIGNAL_APP_ID` and `NOTIFICATIONS_API_ORIGIN`; the latter is a fixed HTTPS origin, with no credentials/path/query/fragment. Native code selects the two fixed `/api/notifications/` paths. Do not put Clerk secrets, provider tokens, signing keys or notification payloads in JavaScript, build settings intended for public values, or committed configuration.
5. Prepare two controlled accounts and two installations. Run the end-to-end journey above, including permission denial/settings, fresh server readiness, foreground/background/terminated delivery, account switching, offline logout/reconnect, safe URL taps and second-device isolation.
6. Record physical-device accessibility and privacy checks (enlarged text, VoiceOver/TalkBack, sanitized device logs, resolved permissions) in evidence.md. Automated component/native contract tests and simulator builds do not establish these outcomes.

Missing/malformed notification configuration should leave auth and ordinary health usable while notifications remain unavailable. No deployment, production provider change, or automatic notification sender is part of this implementation.

## Native configuration and build boundaries

Android reads public `ONESIGNAL_APP_ID` and `NOTIFICATIONS_API_ORIGIN` environment variables during the Gradle build and writes their values to BuildConfig. iOS reads the corresponding Xcode build settings through `WeaveOneSignalAppId` and `WeaveNotificationsAPIOrigin` in Info.plist; supply them in the chosen build configuration or as explicit `xcodebuild` arguments. These public values must agree with the API environment. The API origin may have a trailing slash but no other path, credentials, query or fragment. Empty or malformed values deliberately leave notification setup unavailable.

The iOS target uses `Weave/Weave.entitlements`, with `APS_ENVIRONMENT=development` in Debug and `production` in Release. Actual signing and APNs provisioning remain required. The iOS React Native OneSignal wrapper is excluded from autolinking because the native coordinator owns initialization; Pods pin the modular OneSignal 5.8.0 SDK directly. Android retains the locked 5.10.2 modular SDK through the wrapper. No Notification Service Extension or App Group is part of this plain-push scope. Android uses the SDK default channel and the committed small notification icon.

Automated native validation covers the Android debug APK (four default ABIs) and an unsigned iOS simulator app/test build. Release/optimized Android variants, signed iOS archives and physical device delivery are not covered by those build results.

The draft PR is stacked on `feat/WEA-28/mobile-i18n` (PR #13). Current repository PR policy and CI triggers target develop/main, so the feature stack has no required CI result yet. After ancestors merge, retarget to develop and obtain the required CI checks and code-owner review before merging; no policy or protection bypass is requested.
