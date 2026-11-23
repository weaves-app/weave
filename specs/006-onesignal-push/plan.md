# Implementation Plan: Mobile Push Notifications

**Branch**: `feat/WEA-29/onesignal-push` | **Date**: 2026-10-16 | **Spec**: [spec.md](spec.md) | **Ticket**: [WEA-29](https://linear.app/weaveapp/issue/WEA-29/integrate-onesignal-push-notifications-in-the-react-native-app)

**Implementation update (2026-10-17):** User confirmed S01–S11 and the stack on PR #13; branch fast-forwarded to `75814ad85894460ddeae46c9aa337f0d09463f5c`. Historical planning gates below are now satisfied; external acceptance remains open.

## Summary

Add an English notification status/control area to authenticated Home, native OneSignal delivery on Android/iOS, and an authenticated API that confirms the current installation before the app reports ready. The user explicitly selected server confirmation during planning. Business notification sending and scheduling remain excluded.

Use a framework-free notification controller, a root-owned vanilla Zustand store, and one process-owned native notification coordinator. Read the existing validated auth contract; do not create another session authority. Add a narrow native bridge for signed OneSignal account binding and authenticated verification transport so credentials remain outside JavaScript state. The API derives the account from Clerk authentication, issues short-lived binding credentials and reads the provider's account/subscription record. A shared PostgreSQL budget respects provider capacity across API replicas. No app-owned navigation is needed: notification taps open the ordinary session-gated Login/Home flow.

## Technical Context

**Language/Version**: TypeScript 6.0.3; Node >=22.12; existing Swift/Kotlin native conventions; Android Kotlin 2.1.20 and Java 17.

**Primary Dependencies**: React 19.2.3, React Native 0.86.3 with New Architecture/Hermes; adopt exact `react-native-onesignal@5.5.15` (latest registry release checked 2026-10-16), with its Android 5.10.2 and iOS 5.8.0 SDKs. Reuse prerequisite navigation, Zustand 5.0.15 and i18next 26.4.5. API remains NestJS 11 / Prisma 7 / PostgreSQL. Clerk server verification and ES256 signing use pinned published libraries selected in [research.md](research.md); no custom cryptography.

**Storage**: Ephemeral root notification state; SDK-owned native registration; existing native secure auth storage. PostgreSQL stores bounded request-budget rows only. No notification inbox, provider-profile cache or separate user directory.

**Testing**: Jest/Testing Library for public mobile behavior; native Android and iOS contract/runtime tests; Node API use-case and live HTTP tests; real PostgreSQL concurrency tests; Metro/native builds; controlled physical-device delivery and accessibility evidence.

**Target Platform**: Existing Android minSdk 24 and iOS deployment target 17; Android Google Play Services and configured APNs/FCM are acceptance prerequisites. Backend uses the existing API deployment.

**Project Type**: Vanilla React Native mobile application plus a bounded feature in the existing API modular monolith.

**Performance Goals**: Never block sign-out, normal navigation or form interaction on push work. Coalesce overlapping work; at most one app-owned setup/check attempt per explicit Retry or distinct foreground activation. One provider lookup per second per OneSignal app across replicas, no catch-up burst, no background polling loop. Network attempts time out after 5 seconds. A positive readiness observation expires after at most 60 seconds, conservatively measured from the JS attempt start and the native request start using separate monotonic clocks; bridge results carry attemptId/remainingValidityMs, never an absolute native deadline. Expiration changes the display to pending without starting a poll. Native HTTP bodies are capped at 16 KiB; signing requires at least 15 seconds of remaining authenticated-token validity. Budget cleanup is limited to 100 rows per sweep and one sweep per 60 seconds per app, with account expiry set to nextAllowedAt + 24 hours.

**Constraints**: No unsolicited permission prompts; no credentials in JS/Zustand/logs; server-derived identity; no SDK booleans treated as remote acknowledgement; current-generation responses only; native Launch URL suppression; English/a11y; generic payloads; fail closed when verification is unavailable. Native SDK queues cannot guarantee immediate remote revocation. Identity Verification is a provider beta prerequisite, documented in research; absence blocks secure delivery acceptance, not normal app use.

**Scale/Scope**: Two platforms, existing Home, five stories/eleven scenarios, two authenticated backend endpoints. Two accounts/two installations form the controlled acceptance matrix. At larger activation rates, checks may remain pending under the provider budget; this plan does not promise every device instant readiness or bypass the provider's limit.

## Constitution Check

### Before research

- Specification and WEA-29 exist. User invoked planning and approved server-confirmed scope. Full BDD scenario agreement remains pending; planning is permitted, source work is gated.
- Ticket branch originates from develop. The authenticated mobile/store/i18n baseline through PR #13 is missing from this branch; inspect it read-only for design. Do not duplicate or silently stack prerequisite work.
- No source edits, dependency installation, production provisioning, sends, commits or publishing are part of this phase.

### After design

- **Pass — behavioral scope**: [spec.md](spec.md) incorporates the material backend expansion, S11, FR-013 and SC-008. [contracts/scenarios.md](contracts/scenarios.md) maps every scenario to public seams and required evidence.
- **Pass — architecture**: Domain/application ports contain no React, Zustand, Nest, Prisma, HTTP or SDK types. Concrete adapters are wired in composition roots using interfaces and canonical tokens/factories. Auth and notifications interact through published contracts.
- **Pass — UI and types**: Reuse existing primitives/tokens and English catalog. Strict TypeScript, readonly input contracts, unknown boundary parsing, named exports and existing documented native/generated exceptions apply.
- **Pass — security and delivery**: Authenticated server-derived identity, native-only credentials and server signing key; generic payloads; bounded provider reads; no sender endpoint. No deployment or production credentials are provisioned by this plan.
- **Pass — verification design**: Ordered behavioral RED → GREEN → REFACTOR, native/provider/device evidence, full verification and database integration are explicit implementation requirements. No execution evidence is claimed now.
- **Source gate remains closed**: Confirm S01–S11 in workflow, resolve prerequisite baseline by parent merge or explicit stack authorization, then generate tasks and run analysis before implementation. Missing provider beta access, keys, platform credentials or devices must remain open acceptance work.

No constitutional exception is proposed. There is no need to alter Turborepo configuration or commands.

## Project Structure

### Documentation

```text
specs/006-onesignal-push/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── workflow.json
├── checklists/requirements.md
└── contracts/
    ├── application.md
    ├── backend.md
    ├── native-and-ui.md
    └── scenarios.md
```

`tasks.md`, ordered test evidence and convergence are later workflow outputs, not generated by this plan.

### Planned source changes after gates pass

```text
apps/mobile/
├── App.tsx                                  # composition / existing auth provider integration
├── src/features/notifications/
│   ├── domain/                              # permission/readiness state and invariants
│   ├── application/                         # controller and consumer-owned ports
│   ├── infrastructure/                      # native adapter and vanilla store
│   ├── presentation/                        # Home status/control component
│   └── index.ts                             # public contracts
├── src/auth/                                # existing auth public-contract integration
├── src/native/NativeWeaveNotifications.ts    # generated-compatible TurboModule contract
├── src/localization/                        # existing English message inventory
├── android/app/src/main/java/si/tryweave/notifications/
├── android/app/src/main/AndroidManifest.xml
├── ios/Weave/Notifications/
├── ios/Weave/Info.plist
├── ios/Weave/Weave.entitlements              # capabilities; actual target path verified at implementation
├── ios/Podfile
└── package.json / native lock/config files / platform tests
apps/api/
├── src/modules/authentication/              # public session verifier and HTTP guard
├── src/modules/notifications/
│   ├── domain/
│   ├── application/                         # grant / verify use cases and ports
│   ├── infrastructure/                      # OneSignal, JWT and budget adapters
│   ├── presentation/                        # validated HTTP input/output
│   └── notifications.module.ts              # token/factory composition
├── prisma/schema.prisma
├── prisma/migrations/                       # shared request-budget table
├── src/scripts/cleanup-notification-budgets.ts # one-shot bounded maintenance command
└── test/                                    # unit, HTTP and persistence contracts
```

These paths describe planned feature boundaries; exact existing parent paths are reconciled once the prerequisite baseline is available. Extend the repository integration harness for the budget table and use existing native scripts. Commit required package/native locks and configuration templates, never credentials or generated build outputs. Source remains unchanged during planning.
