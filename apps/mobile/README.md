# Weave mobile

Vanilla React Native 0.86.3 / React 19.2.3, Community CLI, committed Android/iOS projects. Install npm dependencies from the repository root; do not create an independent mobile lockfile. See the [official environment guide](https://reactnative.dev/docs/0.86/set-up-your-environment).

## Development

- Android: JDK 17, Android SDK platform/build tools 36, NDK 27.1.12297006, emulator or device. Set ANDROID_HOME to your SDK; local.properties stays ignored.
- iOS: full Xcode with a compatible iOS SDK, Ruby 3.3 (matching CI), Bundler 2.5.22 and the locked CocoaPods dependencies. Command Line Tools alone cannot compile iOS.
- Run `npm run dev --workspace=@weave/mobile` from the root for Metro.
- Android: `npm run android --workspace=@weave/mobile` in another terminal.
- iOS: from apps/mobile run `bundle install`; from ios run `bundle exec pod install`. Then root `npm run ios --workspace=@weave/mobile`.

## Validation

Root `npm run verify` runs types/component tests and Metro production bundling for both platforms. `npm run native:android --workspace=@weave/mobile` assembles a debug APK with a locally generated development key. After installing pods, `npm run native:ios --workspace=@weave/mobile` compiles an unsigned simulator app. Native jobs run in CI and gate the mobile status; Android CI compiles x86_64 for the development emulator, while local Gradle defaults retain the template-supported architectures. These checks do not launch the app on a device.

Metro watches shared workspaces and resolves the root node_modules to avoid duplicate React installations. Android Gradle explicitly resolves hoisted RN/codegen/CLI; iOS uses the official hoisting-aware Podfile. The application name Weave matches AppRegistry and both native launchers. Native configuration and SDK integrations require platform-specific review.

Release builds have no debug signing configured. Add protected production signing and store identifiers in a dedicated release ticket; never commit release signing credentials. CI artifacts are development/compilation artifacts and must not be shipped as store releases.

Gemfile.lock and ios/Podfile.lock are committed for reproducible native installs. CI uses `bundle exec pod install --deployment`; after adopting a native dependency under its own ticket, update the lockfile locally with pod install and review the change.
