# Decisions

Expo: official React Native framework with npm monorepo support; use official blank TypeScript template and its compatible SDK dependencies. Alternative bare RN adds native project setup before product requirements warrant it. Expo selected by user instruction to continue.

Spec Kit: v1.1.0 source f1d3a4f8337ebbd3ae22760a9c12e3352b93a175, Codex skills mode, official CLI bundled templates. feature.json selects spec independently of ticket branch.

Release/deployment: see docs/research/weave-delivery-plan.md; no production credentials/hosting decisions assumed. Rules already configured by prior user approval are preserved.

## Review choices

Use installed Turbo 2.11.7 docs for workspace caching/prune. Retain custom interface DI checker and fix per-workspace resolution rather than adding dependency-cruiser. Keep full CI checks. Use QEMU for architecture runtime checks initially; native runners remain an optimization. Preserve license notices. Dependency bots cannot bypass ticket/spec rules; updates enter a documented adoption process. Node24 can load current source tokens but compiled packages are required for backend portability.

## Vanilla React Native migration (2026-10-04)

User decision replaces Expo with React Native Community CLI. Official template @react-native-community/template@0.86.3 was generated with CLI 20.2.0; the template's package tooling pins CLI 20.1.0 and RN tools 0.86.3. Preserve the template's supported React 19.2.3. Native Gradle/CocoaPods ownership remains with the team; monorepo hoisting requires explicit Android paths and Metro watchFolders/resolution. AppRegistry name is Weave; mobile source remains reusable native components with shared semantic tokens.

Sources: [framework-free setup](https://reactnative.dev/docs/0.86/getting-started-without-a-framework), [native environment](https://reactnative.dev/docs/0.86/set-up-your-environment), [Metro configuration](https://reactnative.dev/docs/0.86/metro). Native platform files retain official template conventions and MIT attribution. Local Android SDK and full Xcode are unavailable; use required native CI compile checks rather than claiming local compilation.
