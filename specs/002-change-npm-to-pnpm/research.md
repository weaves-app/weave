# Migration research

- Decision: pin locally installed pnpm 11.1.1. Node 24 satisfies pnpm 11's Node 22+ requirement. Configuration is in pnpm-workspace.yaml; allowBuilds replaces removed build settings. Sources: [pnpm 11 release](https://github.com/pnpm/pnpm.io/blob/main/blog/releases/11.0.md), [settings](https://pnpm.io/settings).
- Decision: nodeLinker: hoisted. Existing Gradle, Podfile and Metro resolution assumes root node_modules. Isolated symlinks would require broader native path changes. Source: [node linker](https://pnpm.io/settings/node-modules#nodelinker).
- Decision: import rather than re-resolve dependencies; explicit workspace:* prevents accidental registry resolution. Source: [pnpm import](https://pnpm.io/cli/import).
- Decision: prune with the existing locked Turbo 2.11.7. No dependencies were installed initially, so its exact package was downloaded/extracted to /private/tmp; read docs/README.md first and relevant prune/configuration/workspace pages. Frozen validation of resulting lockfiles determines compatibility.
- Decision: API uses a fresh production-only frozen install in the pruned workspace after compilation, rather than recursive prune (not supported). Keep generated Prisma output in dist. Web retains Next standalone packaging.
- Decision: retain Dependabot package-ecosystem: npm, which is its ecosystem identifier covering pnpm; do not rename this API value.
- Decision: bootstrap pnpm with the base image/runner npm using an exact validated packageManager value and --ignore-scripts; all project install/task commands use pnpm. Avoid a new Action dependency or global Turbo version drift.
