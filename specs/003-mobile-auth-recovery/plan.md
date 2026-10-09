# Implementation Plan: Mobile Login and Error Recovery

**Branch**: `feat/WEA-10/mobile-auth-recovery` from verified remote develop `27698fb1a257259e12946e1526e57b1c6fc58836` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: `specs/003-mobile-auth-recovery/spec.md`, linked to WEA-10.

**Status**: Planning complete — Phase 0 research and Phase 1 design finalized. User approved iOS 17+ on 2026-10-07. Implementation setup has begun: branch and S01–S20 agreement are recorded; JS navigation dependencies are partially installed. Native SDK adoption is held at T003 pending the logging remediation decision in contracts/sdk-compatibility.md; runtime/native compatibility remains unverified.

## Summary

Provide existing-account login by password, email code, and Google, with Login as the only public route and Home as the only protected route. Home contains only Logout. Auth state conditionally registers one native-stack screen. A top-level JS boundary shows Reload after catchable screen/provider/navigation failures; Reload remounts UI and explicitly validates the session.

Selected platform path: Clerk's native core Android/iOS SDKs behind an authored React Native TurboModule, preserving Community CLI and existing native projects. The minimum supported iOS version will be raised to 17 during implementation, as approved by the user. See [research](research.md) for primary sources, platform impact and alternatives. Model/contracts/test map are independent design outputs and do not establish a passed native integration.

The Linear issue also includes web/public/invitation signup. Direct user clarification limits this slice to existing-account mobile login. Use the same identity application as web without changing shared signup policy; do not claim whole-ticket completion.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.2.3, React Native 0.86.3; native Kotlin and Swift integration with RN codegen. Verified develop uses npm 11.19.0 workspaces with hoisted dependencies and Node .nvmrc. WEA-8 pnpm migration is unmerged; preserve the develop package manager for this ticket.

**Primary Dependencies**: React Navigation native/native-stack v7, react-native-screens v4 with documented RN0.86 Fabric range, existing react-native-safe-area-context ~5.7.0, @weave/design-tokens. Selected ClerkKit 1.6.0 and clerk-android-api 1.1.11; exact JS patches and compatible native toolchains locked and verified during dependency adoption. No Expo, Expo Router or prebuilt Clerk UI dependency is selected.

**Storage**: Provider-native Keychain/Keystore-backed credentials only; no app database, password/code persistence, local profile replica or navigation persistence.

**Testing**: Existing Jest 29 RN preset and Testing Library; fake AuthenticationGateway/Clock, real navigator behavior, native adapter contract tests, Android/iOS compilation and manual real-provider/device journeys.

**Target Platform**: Android minSdk24/compileSdk36/JDK17. iOS17+ minimum approved (source projects currently target iOS15.1 and must be updated during implementation); selected ClerkKit requires a Swift6.2-capable Xcode toolchain. Toolchain updates must be scoped/documented, not assumed passing.

**Project Type**: Mobile application in existing monorepo; no API/web source changes or universal SDK abstraction.

**Performance Goals**: Screen transition within 2 seconds after successful session resolution/login/logout under controlled healthy-service runs; no protected-content flash. Bounded waits: network operations 30 seconds, Google foreground wait 120 seconds with injected-clock tests.

**Constraints**: Existing accounts only, no automatic signup even during OAuth, same environment identity instance as web, no secret keys, no global auth-policy changes, strict fail-closed session restoration, no Expo migration, no production native signing/store release/deployment.

**Scale/Scope**: Two routes; three login methods; one active local session; S01–S20 and FR-001–FR-015. Recovery/loading states do not add routes. No account administration, invitation handling or data lists.

## Constitution Check

_Before research: document-only planning authorized; no source changes. After design: all planning gates pass with the user-approved iOS 17+ scope. Branch/scenario agreement and execution evidence remain prerequisites for implementation, not claims of completed implementation._

| Gate                                  | Result / enforcement                                                                                                                                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec/ticket traceability              | PASS for design: separate numbered WEA-10 feature, accepted method/registration decisions and iOS 17+ approval; broader Linear scope conflict explicitly recorded |
| BDD before implementation             | PASS T002: user confirmed S01–S20; workflow.json records the exact statement and scenariosConfirmed is true                                                       |
| Meaningful TDD                        | PASS DESIGN: each behavioral slice orders real RED, minimum GREEN, refactor and actual evidence; no test runs claimed                                             |
| Strict TypeScript / named exports     | PASS DESIGN: interfaces, readonly inputs, unknown at native boundaries, single quotes/semicolons; native/codegen framework exceptions documented                  |
| Framework-free core / DI              | PASS DESIGN: domain/application depend on AuthenticationGateway/Clock; concrete SDK/native wiring only in composition roots via canonical tokens                  |
| UI consistency/accessibility          | PASS DESIGN: reuse current primitives/tokens; add only needed form/feedback primitives; manual screen-reader/text/keyboard acceptance                             |
| Retain native stack/platform scope    | PASS DESIGN: native SDK path preserves Community CLI; user explicitly approved iOS 17+ on 2026-10-07                                                              |
| Ticket branch from develop            | PASS T001: WEA-10 branch starts verified remote develop; artifacts preserved and unmerged WEA-8 work excluded                                                     |
| Identity/commit/publishing            | PASS DESIGN: no commits/pushes; local personal author/committer verification and ticket Conventional Commit required before publishing                            |
| Verify / DB integration / convergence | PASS DESIGN: runnable existing commands and manual acceptance in quickstart; tasks/evidence/convergence created in subsequent phases                              |
| Immutable releases / no deployment    | PASS: no release or container config changes; native signing/store scope separate                                                                                 |

No constitution exception is needed. The platform choice is resolved; BDD confirmation and the ticket branch are recorded as completed T001/T002. T003 now exposes an SDK logging incompatibility requiring an adoption decision before dependent native/behavior implementation. Remote Clerk configuration/test accounts are explicit owner prerequisites; do not silently provision them.

## Project Structure

### Documentation (this feature)

```text
specs/003-mobile-auth-recovery/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── workflow.json
├── checklists/requirements.md
└── contracts/
    ├── authentication.md
    └── scenario-tests.md
```

`tasks.md` belongs to speckit-tasks; evidence.md and convergence.md are populated during implementation/convergence. They are not fabricated during planning.

### Source Code (proposed, not created)

```text
apps/mobile/
├── App.tsx                         # composition root and generation reset
├── src/
│   ├── auth/
│   │   ├── domain/                 # auth/session/result models
│   │   ├── application/            # gateway/clock ports and auth controller
│   │   ├── infrastructure/         # validated native gateway adapter
│   │   ├── presentation/           # typed Context/hooks and Login/Home
│   │   ├── auth.tokens.ts
│   │   ├── login.test.tsx
│   │   ├── home.test.tsx
│   │   ├── auth-controller.test.ts
│   │   └── auth-gateway.contract.test.ts
│   ├── native/                     # NativeWeaveAuth TurboModule schema
│   ├── navigation/                 # conditional native stack and tests
│   ├── recovery/                   # top-level boundary, fallback and tests
│   └── components/                 # reuse Button/Screen/Typography; focused fields/feedback
├── android/                        # proposed SDK dependency/module/callback wiring
└── ios/                            # proposed SDK/module/callback wiring and resolved package lock
```

**Structure Decision**: Feature-local authentication core, adapters and presentations in the existing mobile app. No shared web/native wrapper or generic repository. Publish ports/exports; views avoid importing concrete adapters. Swift/Objective-C++ and Kotlin binding details follow the installed RN new-architecture codegen, including registration; actual file names are finalized against compiled generated specifications.

## Design sequence and validation

1. Carry the recorded iOS 17+ decision into native project/toolchain setup. Confirm S01–S20 BDD scenarios before source implementation.
2. Create/adopt WEA-10 develop-based branch; review current dependency compatibility and native toolchains, lock versions, add codegen/native plumbing and establish module contract seam before authored behavior slices.
3. Build pure session/operation controller behind gateway and clock using controlled gateway fakes; RED/GREEN races, timeouts, invalidation and fresh-resolution requests. Native shells remain unavailable until their own behavioral RED/GREEN slice.
4. After native adapter behavioral RED, implement native password/email-code/Google adapters, including email device verification and explicit rejection of unsupported verification tasks, with explicit no-transfer; secure persistence errors, SDK logs and stale native activation need verification. Startup module failures return safe feedback where catchable rather than native crashes.
5. Compose Login/Home and conditional real navigator; reuse primitives, keyboard-aware layout and accessible states; test all method outcomes and history.
6. Add top-level boundary and generation Reload; test root/provider/navigation failures, transient recovery and repeated failures without loops.
7. Wire authored Android/iOS native contract suites into the required mobile-native CI jobs with failure propagation and retained results. Execute test map, root verify, DB integration, both bundles/native compiles and real-provider/device accessibility/callback/storage checks. Save actual results and converge; no mock-only claims of OAuth success.

Details: [contracts/authentication.md](contracts/authentication.md), [contracts/scenario-tests.md](contracts/scenario-tests.md), [quickstart.md](quickstart.md).

## Complexity Tracking

| Added complexity                                  | Why needed                                                                                            | Simpler alternative rejected because                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Authored native module with platform SDK adapters | Retain pure Community CLI while integrating supported Clerk core SDKs and explicit no-signup transfer | Expo runtime migration conflicts with scope; default SSO/signup transfer violates existing-account-only |

This is a design cost, not a constitution waiver. Platform scope is approved; native compilation and live authentication remain unverified until implementation.

## Implementation ruling — verified base

T001 verified remote develop still uses npm. Preserve npm workspaces and package-lock.json for WEA-10 instead of importing the unmerged WEA-8 pnpm migration. This changes dependency/validation commands only; authentication behavior, native SDK pins and hoisted resolution remain as designed. Reassess if develop changes before integration.

## Native identity configuration — 2026-10-08

Owner supplied `tryweave.si` and requested both native package names change. Set Android applicationId/namespace and iOS app bundle identifier to `si.tryweave`; move authored Kotlin packages and update codegen to `si.tryweave.auth`. Use `si.tryweave.auth.contract.tests` for the iOS test bundle. iOS OAuth build-setting defaults use `si.tryweave://callback` and remain overrideable; Android SDK callbacks derive from applicationId. Validate built manifests/Info.plist and existing native suites/builds. This is a configuration rename, without new authentication behavior, release signing or remote Clerk changes.

## Branding follow-up design

T047 uses the owner-supplied kit as the approved visual design. Retain original masters/license in assets/brand; native PNGs/fonts are deterministic platform derivatives, while web uses outlined SVG and local Figtree. Shared semantic colour and font-name tokens coordinate platform renderers. Add the logo to Login and the existing web header, replace template iOS launch labels, populate launcher/browser icons, and supply Android adaptive icon layers using the original symbol paths. Keep auth flows, Home content, and recovery interactions intact. Verify regression suites, asset dimensions/opacity, build resources and rendered previews; cosmetic changes do not claim behavioral RED.

## Approved login/OTP refinement

T049 follows the approved `evidence/login-ux-approved.png` design. Reuse/extend semantic tokens and Button/FormField/Typography/BrandLogo primitives; compose small feature-local method and challenge sections. A six-slot code primitive exposes one native input with one-time-code hints; normalize pasted formatting to six digits and keep provider verification explicit. Prove real input behavior and accessible method selection through meaningful RED/GREEN before implementation. Retain controller/native APIs, rendering safe areas and scroll behavior. Verify current regressions, both Metro bundles and real Android/iOS layouts; distinguish a deterministic UI challenge fixture from real-provider acceptance.

## Login interaction follow-up — T050/T051

Remove the login page's dynamic vertical recentering. A feature-local animated password region measures its natural height, transitions only its own height/opacity and leaves shared controls anchored; reserve its expanded password-plus-action extent so scrolling does not clamp when the row collapses; React Native Animated and AccessibilityInfo honor Reduce Motion without new dependencies. The submit action follows that local height. At the useLogin boundary, a complete six-digit change invokes the existing controller verification operation directly; its synchronous pending guard prevents duplicate requests. Keep credential clearing and provider validation unchanged. Test request/feedback behavior before source changes and retain native before/after bounds plus both-platform animation/automatic-submission evidence.

The T050 scroll extent remains stable when method/error state changes: the measured password/action region reserves its expanded height, and Login retains the maximum observed content height until challenge, width or font scale changes. This prevents platform ScrollView clamping from moving shared controls when a field or feedback disappears.

## T052 owner-requested header refinement — 2026-10-09

Compose one feature-local AuthHeader as a SafeAreaView child above KeyboardAvoidingView/ScrollView. Equal-width navigation slots keep the existing BrandLogo centered with identical sizing in Login and both verification purposes. Only challenge state shows Back, using existing pending/selectMethod contracts. Reuse tokens and 48-point target; keep form transition, automatic verification and auth layering unchanged. Verify non-scrolling header/back interaction at the LoginScreen seam and native centered bounds/keyboard/enlarged-text behavior.

## T053 tablet alignment correction

Center one bounded frame (maximum480 wide/740 high at window widths600+) inside the safe area. Both forms top-align inside it beneath the persistent header; remove conditional OTP centering and OTP-only decorative heading offset. Small windows keep a full-size frame. Retain keyboard avoidance, peak Login scroll extent and existing pending/verification contracts. Validate the before/after alignment regression and native iPad portrait/landscape/large-text plus phone smoke checks.

## T054 responsive composition

Extract a feature-local AuthLayout responsible for safe area, tablet classification and optional landscape artwork. Tablet-sized windows require both dimensions>=600; split view additionally requires landscape and width>=960. Phone forms fill a top-aligned pane, portrait tablet forms retain the480×740 centered frame, and landscape tablet forms occupy a centered bounded frame in the right half. Keep the form subtree stable across resizing. Use a dedicated decorative artwork composition with local image and the reference tagline. Test real Dimensions changes, preservation of partial input and native layouts before restoring real apps on both iOS simulators.
