# Weave mobile

Vanilla React Native 0.86.3 / React 19.2.3, Community CLI, committed Android/iOS projects. Install pnpm dependencies from the repository root; do not create an independent mobile lockfile. See the [official environment guide](https://reactnative.dev/docs/0.86/set-up-your-environment).

## Development

- Android: JDK 17, Android SDK platform/build tools 36, NDK 27.1.12297006, emulator or device. Set ANDROID_HOME to your SDK; local.properties stays ignored.
- iOS: full Xcode with a compatible iOS SDK, Ruby 3.3 (matching CI), Bundler 2.5.22 and the locked CocoaPods dependencies. Command Line Tools alone cannot compile iOS.
- Run `pnpm --filter @weave/mobile run dev` from the root for Metro.
- Android: `pnpm --filter @weave/mobile run android` in another terminal.
- iOS: from apps/mobile run `bundle install`; from ios run `bundle exec pod install`. Then root `pnpm --filter @weave/mobile run ios`.

## Validation

Root `pnpm run verify` runs types/component tests and Metro production bundling for both platforms. `pnpm --filter @weave/mobile run native:android` assembles a debug APK with a locally generated development key. After installing pods, `pnpm --filter @weave/mobile run native:ios` compiles an unsigned simulator app. Native jobs run in CI and gate the mobile status; Android CI compiles x86_64 for the development emulator, while local Gradle defaults retain the template-supported architectures. These checks do not launch the app on a device.

Metro watches shared workspaces and searches the app's node_modules first for local workspace links, then the hoisted root node_modules for external dependencies. React remains aligned through workspace overrides. Android Gradle explicitly resolves hoisted RN/codegen/CLI; iOS uses the official hoisting-aware Podfile. The application name Weave matches AppRegistry and both native launchers. Native configuration and SDK integrations require platform-specific review.

Release builds have no debug signing configured. Add protected production signing and store identifiers in a dedicated release ticket; never commit release signing credentials. CI artifacts are development/compilation artifacts and must not be shipped as store releases.

Gemfile.lock and ios/Podfile.lock are committed for reproducible native installs. CI uses `bundle exec pod install --deployment`; after adopting a native dependency under its own ticket, update the lockfile locally with pod install and review the change.

## WEA-10 authentication

Login supports existing accounts through password, email code (including email device trust), and Google. Home has only Logout. React Navigation registers Login or Home from the validated session; no auth URL authorizes Home, route parameters or saved navigation state. Unresolved/unavailable sessions display feedback outside both routes. Unsupported MFA/session tasks display an actionable error and do not bypass Clerk policy.

Clerk runs in native code behind the generated `WeaveAuth` TurboModule. JavaScript receives only safe status, opaque IDs and challenge handles. Android uses Clerk API1.1.11 source at `5d1895dc401a76dd3244eac925ebf87409561a47`; iOS uses ClerkKit1.6.0 at `aff2e9019dcc0978d5955fe98bcde9ab935eecb1`. Licenses and provenance are in `vendor/`. The maintained logging patches suppress raw SDK diagnostics; Android's authored cancellation bridge exposes the existing SSO cancellation without resetting secure credentials. Adopt upgrades through a fresh ticket with privacy/cancellation regression tests.

iOS app/tests/Pods require iOS17+. ClerkKit requires Swift6.2/Xcode26+; CI selects Xcode26.2 on macos-15, as listed in the [official runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-15-Readme.md). Android uses Kotlin2.4.20/KSP2.3.12, JDK17, AGP8.12 and the existing Gradle9.3.1 wrapper. `Podfile.lock`, workspace `Package.resolved`, and Gradle dependency locks are committed. iOS tests/builds refuse automatic Swift package version updates.

### Public configuration

Weave owns `tryweave.si`. Android applicationId/namespace and the iOS app bundle identifier are `si.tryweave`. Register this exact native identity in the shared Clerk instance; production additionally needs the Android signing SHA-256 fingerprint and iOS App ID Prefix.

The owner must enable Native API and all three methods in the same Clerk instance used by web, register the package/bundle and Google callback identities, and provide existing test accounts. Account creation and remote signup policy changes are outside this mobile slice. Never provide a Clerk secret key or put passwords/tokens in configuration.

Android reads `CLERK_PUBLISHABLE_KEY` from the build environment into BuildConfig. Export the public key before `pnpm --filter @weave/mobile run android` or the native build; rebuilding is required after changing it. The SDK owns callbacks `clerk://si.tryweave.callback` and `clerk://si.tryweave.oauth`; register the exact application identity in Clerk. The SDK Google entrypoint explicitly uses `transferable=false`.

iOS reads these Xcode build settings into Info.plist:

- `WEAVE_CLERK_PUBLISHABLE_KEY`: the same environment's public key.
- `WEAVE_AUTH_CALLBACK_SCHEME`: the registered custom URL scheme; defaults to `si.tryweave` from the app bundle identifier.
- `WEAVE_AUTH_CALLBACK_URL`: the exact registered OAuth callback URL using that scheme; defaults to `si.tryweave://callback`.

Set them in a developer-local xcconfig or pass them to xcodebuild, for example `pnpm --filter @weave/mobile run native:ios WEAVE_CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY" WEAVE_AUTH_CALLBACK_SCHEME="$WEAVE_AUTH_CALLBACK_SCHEME" WEAVE_AUTH_CALLBACK_URL="$WEAVE_AUTH_CALLBACK_URL"`. Only public values belong in build resources. `.env.example` is documentation; no runtime dotenv loader is installed. Empty/invalid configuration mounts a safe unavailable state. iOS Google uses Clerk's ASWebAuthenticationSession callback, with `transferable=false`; no magic-link forwarding is installed. Custom schemes require no associated-domain entitlement. Universal-link adoption needs owner-provided domains and separate configuration.

### Developer-local Clerk setup

On this development machine, owner-authorized Weave development public values are saved in ignored `.env.local`. Clerk has Android `si.tryweave` registered with this machine's debug signing SHA-256 and all three callback URLs allowlisted. iOS native application registration is deferred until an actual Apple App ID Prefix is available. Live authentication/device acceptance remains pending.

Load the local public configuration before Android launch/build, then pass the iOS values as Xcode settings when building:

```sh
set -a
. apps/mobile/.env.local
set +a
pnpm --filter @weave/mobile run android
# For an iOS simulator build:
pnpm --filter @weave/mobile run native:ios \
  WEAVE_CLERK_PUBLISHABLE_KEY="$WEAVE_CLERK_PUBLISHABLE_KEY" \
  WEAVE_AUTH_CALLBACK_SCHEME="$WEAVE_AUTH_CALLBACK_SCHEME" \
  WEAVE_AUTH_CALLBACK_URL="$WEAVE_AUTH_CALLBACK_URL"
```

These values remain developer-local; other developers supply their own environment/configuration and register their debug signing certificates.

### Verification and limits

```sh
pnpm --filter @weave/mobile test --watchman=false
pnpm --filter @weave/mobile run lint
pnpm --filter @weave/mobile run typecheck
pnpm --filter @weave/mobile run test:native:android
pnpm --filter @weave/mobile run test:native:ios
pnpm --filter @weave/mobile run test:native:ios:host
pnpm --filter @weave/mobile run native:android
pnpm --filter @weave/mobile run native:ios
```

The host iOS harness compiles/tests Swift auth logic and SDK mappings; it does not replace the RN iOS app/simulator build. The required CI native jobs run all native contract tests and retain JUnit/xcresult artifacts, then compile the apps. See the feature's [evidence](../../specs/003-mobile-auth-recovery/evidence.md) for actual outcomes, blocked tooling and unrun live/device checks.

The top-level boundary catches React subtree render/lifecycle failures and offers explicit Reload. Reload remounts auth/navigation, disposes subscriptions and pending operations, and freshly validates the SDK session. Persistent errors return the fallback without automatic retries. Secure credentials are preserved for validation. Event-handler/async/native crashes are outside React boundary coverage. App code never displays/logs raw errors. A SHA-256-checked RN0.86.3 source patch sanitizes renderer diagnostic objects at caught, uncaught and recoverable severities, retaining severity/fatality while removing raw values and stacks. Mobile postinstall applies it, and the privacy probe gates tests; an unknown RN version/source fails and requires explicit adoption review. This avoids private/global runtime interception. Device log verification remains outstanding.

SDK secure storage remains authoritative (Android Keystore encryption; iOS Keychain). Injected read/write/clear failures and iOS Keychain health checks fail closed. Upstream SDKs silently swallow some cached-client persistence failures; a health probe cannot prove every SDK-owned write. Restart, real provider, callback, accessibility and storage validation on both devices remain required acceptance checks.

### Run a signed local iOS simulator build

The `native:ios` script intentionally uses `CODE_SIGNING_ALLOWED=NO` for compilation checks. To run the app with working simulator Keychain access, select your personal team in Xcode and override the compile-only setting with Xcode-managed ad-hoc signing. Start Metro before launching the simulator app:

```sh
pnpm --filter @weave/mobile run dev
```

In another terminal, load the ignored public configuration as above, then build:

```sh
pnpm --filter @weave/mobile run native:ios \
  CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  WEAVE_CLERK_PUBLISHABLE_KEY="$WEAVE_CLERK_PUBLISHABLE_KEY" \
  WEAVE_AUTH_CALLBACK_SCHEME="$WEAVE_AUTH_CALLBACK_SCHEME" \
  WEAVE_AUTH_CALLBACK_URL="$WEAVE_AUTH_CALLBACK_URL"
```

Install and launch the app on your selected simulator using Xcode or `simctl`. The build must generate the simulator `application-identifier` entitlement; manually signing a copied unsigned app is not equivalent. This local simulator path was verified on iPhone17Pro/iOS26.2 after the owner selected their team. It does not verify device provisioning, paid membership, store distribution, or live login acceptance.
