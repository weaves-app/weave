# Mobile

Read root AGENTS.md and docs/standards/{react-native,typescript,testing-and-delivery}.md.
Use Expo's supported React/React Native versions as a matched set. Reuse src/components primitives and @weave/design-tokens, documenting variants and disabled/loading/error states. Keep domain/network logic outside view components. Use accessible labels/roles, touch targets, safe areas and keyboard-aware forms. Use FlatList for large collections; stable keys, memoization only after measuring. Components compose screens; do not turn every non-UI operation into a component. Jest Expo and React Native Testing Library verify user-visible behavior; exported JS bundles do not establish native-device correctness. Native signing, EAS/store publication require a separate release plan.
