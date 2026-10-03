# Starter component catalogue

Shared `@weave/design-tokens` defines semantic colors, spacing and radius. Web applies them as CSS variables; native uses them through StyleSheet. Keep platform-neutral values in this package and reuse variants rather than copying styles.

| Native primitive | Variants                   | Accessibility                                                                                                  |
| ---------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Button           | Default, disabled, loading | Button role, explicit label, busy/disabled state, minimum 48-point target; inactive states never invoke action |
| Screen           | Content wrapper            | Safe-area container, consistent spacing/background                                                             |

The starter is a technical scaffold, not an approved product design. Before feature UI, specify typography/spacing, hierarchy, light/dark behavior, responsive/safe-area behavior and loading/empty/error/disabled states. Expand the catalogue with reviewed examples. Reuse primitives when semantics match; avoid a universal component full of unrelated flags. Platform renderers remain separate.
