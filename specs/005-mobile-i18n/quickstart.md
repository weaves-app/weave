# Validation Guide: Mobile Internationalization

WEA-28 · Implementation validation guide. Actual results are recorded in evidence.md; unrun native/device commands remain explicitly pending.

## Prerequisites

Use feat/WEA-28/mobile-i18n above PR #12, the active specs/005-mobile-i18n directory, pinned pnpm and repository-recommended Node. Confirm S01–S08 before source edits, generate tasks and analyze. Read apps/mobile/README.md for Android/iOS toolchains and existing live auth setup. Integration uses a migrated disposable local PostgreSQL fixture. No new provider credentials, account configuration or native locale module is required.

## Dependency adoption (implementation only)

```sh
pnpm --filter @weave/mobile add --save-exact i18next@latest
pnpm install --frozen-lockfile
```

Latest stable verified during planning: 26.4.5. Record the actual resolution and recheck APIs/peers if it differs. No react-i18next/backend/detector/persistence plugin is planned. Verify imports separately; import failures cannot be behavioral RED.

## Focused behavioral validation

Create actual test files through tasks/TDD before executing their expected failing assertions:

```sh
pnpm --filter @weave/mobile exec jest --runInBand --watchman=false src/localization
pnpm --filter @weave/mobile exec jest --runInBand --watchman=false src/auth/login.test.tsx src/auth/app-recovery.test.tsx src/navigation/root-navigator.test.tsx
pnpm --filter @weave/mobile run test --watchman=false
pnpm --filter @weave/mobile run lint
pnpm --filter @weave/mobile run typecheck
```

Expected outcomes are in [scenario-tests.md](contracts/scenario-tests.md): 51-entry completeness validation catches every deleted entry; exact count examples; no raw keys/markers/blank controls; offline and provider-free recovery; separate engine/resource trees; no locale-only auth calls or form resets. Sentinel/expanded English rendered tests prove text injection without relying on implementation source searches as behavioral tests.

## Repository and native validation

```sh
pnpm run verify
pnpm run db:deploy
pnpm run test:integration
pnpm --filter @weave/mobile run build
pnpm --filter @weave/mobile run test:native:android
pnpm --filter @weave/mobile run test:native:ios
pnpm --filter @weave/mobile run test:native:ios:host
pnpm --filter @weave/mobile run native:android
pnpm --filter @weave/mobile run native:ios
```

Supply DATABASE_URL for the disposable database when Prisma requires it. Watchman/build caches may require local socket access; report environment failures honestly and rerun with the permitted environment. Both Metro bundles and native compiles must pass; no native project configuration changes are expected.

## Android and iOS journeys

Start Metro with `pnpm --filter @weave/mobile run dev`, launch the configured platform app, then perform the exact [scenario/platform and layout matrix](contracts/scenario-tests.md). Verify English under English/non-English OS preferences, all existing auth flows, dynamic retry feedback, offline errors, Reload, VoiceOver/TalkBack and enlarged text. Compare matched unchanged/changed-locale background/foreground runs: localization must add zero auth operations, remounts or form/navigation resets beyond the parent's existing refresh/revalidation behavior. Do not assert zero total foreground auth operations. Native/provider-controlled UI is outside this ticket's copy inventory.

Use controlled app/gateway/resource test fixtures for missing-catalog and engine failures; do not add a production debug screen or expose credentials to induce faults. Missing live fixtures/devices remain unverified; do not turn compilation into device acceptance.

## Native expanded-English fixture

T035–T037 implemented the [fixture contract](contracts/native-fixture.md). All ten fixture bundles and both normal bundle graphs were verified. Debug launch commands below are separate device acceptance; their actual execution is recorded in evidence/device-acceptance.md. Use a debug Android emulator/device and an installed iOS simulator; missing toolchains/devices remain unverified.

Stop any Metro process serving port 8081. From repository root, start the explicit fixture server in one terminal:

```sh
WEAVE_I18N_FIXTURE_SCENARIO=login pnpm --filter @weave/mobile exec react-native start --config metro.i18n-fixture.config.cjs --port 8081 --reset-cache
```

In another terminal, launch each platform against that already-running server:

```sh
pnpm --filter @weave/mobile exec react-native run-android --no-packager --port 8081
pnpm --filter @weave/mobile exec react-native run-ios --no-packager --port 8081
```

Use the existing app's device-selection/setup instructions if multiple devices are present. The fixture configuration rewrites the native index bundle request to the selected test entry and aliases the English resource module to an immutable expanded copy, including pure recovery text. Nothing edits production index.ts or canonical English.

Repeat by stopping fixture Metro, changing the scenario value to verification, home, retry and recovery in turn, restarting the same command and fully reloading the app. Follow the exact ordinary interactions in the contract's scenario table; no debug menu inside the product is added. Run the phone/tablet portrait/landscape/font-scale matrix for each applicable screen with TalkBack/VoiceOver. Record achieved viewport/font settings, scenario, screenshots/focus/scroll/action results and any unsupported combination. Fixture gateway results are synthetic; use the normal entry and existing authorized auth fixtures for real session/provider/offline acceptance.

Before acceptance, T037 must prove Android/iOS bundles for every fixture entry resolve, and normal entry bundles exclude fixture modules. When finished, stop fixture Metro and return to canonical wording:

```sh
pnpm --filter @weave/mobile exec react-native start --port 8081 --reset-cache
```

Reload/relaunch both apps and verify normal English. Do not leave a fixture server running for subsequent normal-entry acceptance. No source/config restoration is required.

## Delivery

Record actual RED/GREEN/refactor, catalog inventory review, verification and device results; run converge. Preserve parent WEA-27/WEA-10 acceptance gaps. Verify repository-local personal author/committer before publication, include ticket/spec/evidence links and create the requested stacked draft on PR #12's head only during implementation delivery. Current PR policy accepts develop/main; retarget after the parent merges and require CI/code-owner review without bypass. Planning does not create artificial tasks/evidence/convergence to satisfy the later-phase commit hook.
