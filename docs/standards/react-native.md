# React Native and design consistency

Status: adopted. The vanilla React Native scaffold lives in apps/mobile.

React encourages a component hierarchy with focused responsibilities and minimal state. Hooks reuse behavior, not shared state instances. [Thinking in React](https://react.dev/learn/thinking-in-react), [custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks).

## Weave policy

UI is component-based; business rules, API adapters, utilities, and use cases are plain TypeScript modules. Screens compose components and coordinate state. Every reusable primitive must have a clear props contract and must avoid coupling to a particular screen, navigation route, or concrete API client. Feature-specific compositions may remain local; do not force them into a generic library merely because they are components.

Build a mobile design system before feature screens: semantic color tokens, typography, spacing, radius, elevation, motion, and light/dark themes. Use tokens instead of arbitrary values in screens. Start with Button, Text, Input, FormField, and feedback/loading primitives. Define variants and disabled/loading/error/focus behavior, then document them in a component catalogue with usage and accessibility examples.

Share design tokens, API contracts/client abstractions, and pure behavior with web when useful. Web DOM and native UI components generally need separate implementations; matching semantics and visual rules does not require identical rendering code. Avoid backend domain internals and Prisma types in either frontend. Introduce packages/design-tokens, packages/contracts, packages/ui-web, and packages/ui-native only as their actual use emerges.

Inject API/storage/analytics interfaces through factories, props, or typed React Context. Use constructor DI for plain use cases; React components do not need Nest-style containers. Reuse components and hooks; do not copy existing primitives to make screen-specific variants.

## Platform requirements

- Support screen readers, meaningful roles/labels, scalable text, readable contrast, accessible controls, and focus order. Test VoiceOver and TalkBack. [Accessibility](https://reactnative.dev/docs/accessibility).
- Profile release builds on real devices. Use virtualized lists for long collections, stable keys, and measured optimization rather than blanket memoization. [Performance](https://reactnative.dev/docs/performance).
- Keep secrets out of the bundle. Use platform-backed secure storage for sensitive credentials; ordinary async storage is not encrypted credential storage. [Security](https://reactnative.dev/docs/security).
- Define offline/error/retry behavior, safe areas, keyboard handling, and navigation semantics in feature specs.
- Test components and hooks behavior, visual variants, API adapters, and critical device journeys. Include theme, text-size, and accessibility states in design acceptance criteria.

WEA-6 selects vanilla React Native 0.86.3 with React 19.2.3 and version-matched Metro/Babel/Jest/TypeScript tooling. This supersedes the initial Expo scaffold by user decision on 2026-10-04. Existing primitives and shared tokens remain.

## Native project ownership

Commit Android/iOS source projects and review native configuration changes. Keep local SDK paths, Pods, compiled outputs and signing secrets untracked. Android Gradle paths and Metro resolve the repository-root npm installation; the Podfile resolves React Native through Node for hoisting. Use React Native autolinking for native libraries; verify each library on both platforms.

Run Metro with `npm run dev --workspace=@weave/mobile`, then `npm run android --workspace=@weave/mobile` or `npm run ios --workspace=@weave/mobile` with the appropriate SDK/device. iOS requires `bundle install` from apps/mobile and `bundle exec pod install` from apps/mobile/ios. See apps/mobile/README.md for prerequisites and compile commands.

CI builds both Metro JS bundles, an Android debug APK and an unsigned iOS simulator app. These are compilation artifacts, not store releases or device acceptance evidence. Release signing, real-device accessibility/performance testing and SemVer/store version mapping require their own release plan. Framework CommonJS config and official generated native source retain their upstream conventions; authored TypeScript remains subject to shared rules. App uses a named export.
