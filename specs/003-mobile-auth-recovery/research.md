# WEA-10 mobile authentication research

Date: 2026-10-07. Repository and primary upstream sources reviewed. Design research is not runtime compatibility or behavioral test evidence.

## Scope and ticket conflict

Decision: Follow this session's explicit mobile scope and clarification: three login methods, existing accounts only, Login/Home only, Logout and recovery. Do not modify the Linear issue or message its other owner.

Rationale: [WEA-10](https://linear.app/weaveapp/issue/WEA-10/implement-clerk-authentication-in-nextjs-and-react-native), retrieved through Linear, also describes public and invitation signup and a Home label on both web and native. Its web implementation is owned by Vishnuu C.V and mobile by Pravin Raj. These broader criteria are not delivered by this slice. Direct user scope takes precedence. Use the same Clerk identity application per environment without changing its shared signup settings.

Alternatives considered: extending scope to signup/invitations or globally disabling registration would contradict the current request or interfere with web work. Whole-ticket completion remains outside this slice's completion claim.

## Clerk integration without Expo migration

Decision, approved platform scope: use Clerk's official native core SDKs behind a small authored React Native TurboModule, with custom React Native screens. Selected exact pins: ClerkKit 1.6.0 through Swift Package Manager, and com.clerk:clerk-android-api:1.1.11 through Gradle. The [iOS release](https://github.com/clerk/clerk-ios/releases/tag/1.6.0) and [Android release](https://github.com/clerk/clerk-android/releases/tag/v1.1.11) were inspected. Adopt immutable versions and commit relevant native resolution locks, not latest/main dependencies.

Rationale: This preserves Community CLI, React 19.2.3, RN 0.86.3, committed native projects and React Navigation. Clerk supplies native SDKs but not this authored wrapper; the wrapper needs codegen, native contract tests and both platform builds. [React Native TurboModules](https://reactnative.dev/docs/turbo-native-modules-introduction) describes the integration mechanism. The official [iOS authentication reference](https://clerk.com/docs/ios/reference/native-mobile/auth) and [Android authentication reference](https://clerk.com/docs/android/reference/native-mobile/auth) expose password and email-code flows.

Platform decision: the [pinned iOS manifest](https://github.com/clerk/clerk-ios/blob/1.6.0/Package.swift) requires iOS 17 and Swift 6.2; Weave currently targets iOS 15.1 and RN's installed minimum is 15.1. User approved iOS 17+ on 2026-10-07, accepting the removal of iOS 15/16 support and the Swift 6.2-capable Xcode requirement. The implementation must update app/test deployment targets and Podfile/platform settings consistently and verify the selected CI Xcode. No source minimum version has been changed during planning. Android's [pinned dependency catalog](https://github.com/clerk/clerk-android/blob/v1.1.11/gradle/libs.versions.toml) must be checked against Weave's Kotlin/AGP stack before dependency adoption; minSdk 24 and Java 17 align with existing targets, but that is not a successful build claim.

Alternatives considered: adding @clerk/expo and selective Expo modules expands runtime/toolchain dependencies; its [package](https://github.com/clerk/javascript/blob/main/packages/expo/package.json) requires Expo. A peer range accepting RN 0.86 is not a proof of runtime compatibility. Managed Expo/Expo Router migration conflicts with the request. Direct handwritten Clerk HTTP/session machinery increases credential/security burden. Retaining iOS 15.1 would require another integration path; the user approved iOS 17+ instead. Do not silently choose an old SDK or install Expo.

## Existing-account-only Google

Decision: Native adapters must explicitly disable transfer to signup. On pinned iOS use `auth.signInWithOAuth(provider: .google, transferable: false)`; verified in [Auth.swift](https://github.com/clerk/clerk-ios/blob/1.6.0/Sources/ClerkKit/Core/Auth.swift) and [SignIn transfer guard](https://github.com/clerk/clerk-ios/blob/1.6.0/Sources/ClerkKit/Domains/Auth/SignIn/SignIn.swift).

On pinned Android use the lower-level `SignIn.authenticateWithRedirect` with OAuth GOOGLE and `transferable = false`; verified in [SignIn.kt](https://github.com/clerk/clerk-android/blob/v1.1.11/source/api/src/main/kotlin/com/clerk/api/signin/SignIn.kt) and [SSOService.kt](https://github.com/clerk/clerk-android/blob/v1.1.11/source/api/src/main/kotlin/com/clerk/api/sso/SSOService.kt). T003 verified the exact params type: SignIn.AuthenticateWithRedirectParams.OAuth(provider = OAuthProvider.GOOGLE). This entrypoint creates the sign-in attempt internally; no prior SignIn.create call is needed. Do not use pinned Android's higher-level OAuth helper, which lacks the no-transfer argument. Newer main APIs differ from the selected release.

Rationale: Unknown identities fail without signup, while the same identity instance can retain web registration. Map expected unknown-account errors to app-owned copy and verify account count unchanged in S18.

Alternatives considered: default Expo [useSSO](https://github.com/clerk/javascript/blob/main/packages/expo/src/hooks/useSSO.ts) transfers unknown identities to signup. Refusing to activate a session after account creation is too late. UI-only hiding of signup is insufficient.

## Secure storage and native callbacks

Decision: Let the selected native SDK own secure device/session persistence; expose sanitized snapshots, not tokens, across the authored boundary. Verify write/read/clear failure behavior rather than assuming SDK storage always succeeds.

Rationale: iOS uses Keychain via [native configuration](https://clerk.com/docs/ios/reference/native-mobile/configuration); Android's pinned [StorageHelper](https://github.com/clerk/clerk-android/blob/v1.1.11/source/api/src/main/kotlin/com/clerk/api/storage/StorageHelper.kt) and [StorageCipher](https://github.com/clerk/clerk-android/blob/v1.1.11/source/api/src/main/kotlin/com/clerk/api/storage/StorageCipher.kt) use platform-backed encrypted persistence. No AsyncStorage credentials.

OAuth callbacks must be owned by the native SDK, distinct from page links. Register exact identities/callbacks; iOS defaults to `<bundleIdentifier>://callback`, Android to `clerk://<applicationId>.callback` per [RedirectConfiguration](https://github.com/clerk/clerk-android/blob/v1.1.11/source/api/src/main/kotlin/com/clerk/api/sso/RedirectConfiguration.kt). Validate cold/warm start, cancellation, stale callback and process death. Remote Native API/Google configuration is an owner prerequisite, not authorized configuration work. [iOS quickstart](https://clerk.com/docs/ios/getting-started/quickstart), [Android quickstart](https://clerk.com/docs/android/getting-started/quickstart).

Alternatives considered: JS plaintext storage, WebView authentication and custom callback-token handling are unnecessary and enlarge the risk surface.

## Navigation

Decision: React Navigation v7 native stack, react-native-screens v4 compatible with RN0.86 Fabric, and existing safe-area-context. Exact JS patch pins selected and recorded during dependency adoption; no unverified latest install instruction. Conditionally register Login or Home after session resolution, with no imperative auth-transition navigation or saved navigation history.

Rationale: [Authentication flow](https://reactnavigation.org/docs/auth-flow/) describes automatic transitions/removal of unavailable screens. [Installation](https://reactnavigation.org/docs/getting-started/) and [screens compatibility](https://github.com/software-mansion/react-native-screens/blob/main/README.md) establish the dependency/native setup; screens 4.26+ documents Fabric support for RN0.84+. Native build verification is still required. Apply documented Android screen-fragment recreation and predictive-back setup, run Pods, and validate back/foreground behavior. [Deep linking](https://reactnavigation.org/docs/deep-linking/) informs denied-route tests; no new public page-link feature is added.

Alternatives considered: exposing Home and redirecting after render can flash protected content; manual pushes can leave stale history; Expo Router violates explicit navigation choice.

## Error recovery and deadlines

Decision: A named-export class boundary surrounds the full JS authentication/navigation subtree. Minimal fallback uses React Native primitives and tokens with no Clerk/navigation dependency. Reload resets an outer root generation, disposes controllers/subscriptions, clears transient fields/history, and explicitly requests fresh native session validation. Native singleton state may survive UI remount; remount alone is not validation.

Rationale: [React error boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) contain descendant render failures, not arbitrary async/event errors or native crashes. [Key-based state reset](https://react.dev/learn/preserving-and-resetting-state) supports the remount design. [DevSettings](https://reactnative.dev/docs/devsettings) is a development module and is unsuitable as production Reload.

Design defaults: 30-second network/session/logout deadlines; Google foreground wait 120 seconds, paused during background handoff. Inject a clock and operation epochs; timeout invalidates pending results and triggers reconciliation of native side effects. On foreground re-resolve before protected interaction. Unexpected MFA/session-task requirements fail closed with explanation; do not disable shared instance policies or enroll MFA.

Alternatives considered: automatic reload loops, a boundary below the auth provider, and raw error dumping contradict usability/privacy requirements.

## Research disposition

Phase 0 research is complete with the iOS 17+ approval recorded. The native Clerk SDK integration is selected and Phase 1 contracts/model/validation design is finalized. All planning unknowns are resolved; credential provisioning, exact JS patch adoption, toolchain alignment and native/runtime verification remain explicit implementation prerequisites. No compiled or real-provider compatibility claim is made by planning.
