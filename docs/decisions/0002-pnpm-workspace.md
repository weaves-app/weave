# WEA-8: pnpm workspace migration

2026-10-04. Supersedes the npm package-manager choice in 0001-workspace-foundation.md.

Use pnpm 11.1.1 with one pnpm-lock.yaml and explicit workspace:* references. Preserve the existing hoisted root node_modules layout for React Native native projects and Metro. Configure React alignment and reviewed dependency lifecycle scripts in pnpm-workspace.yaml. Frozen installs gate CI and pruned Docker builds. Base Node images and CI bootstrap exact validated pnpm with npm; project commands use pnpm. Dependabot retains its npm ecosystem API identifier, covering pnpm manifests and lockfiles. Historical npm evidence is not rewritten.

[Specification](../../specs/002-change-npm-to-pnpm/spec.md), [plan](../../specs/002-change-npm-to-pnpm/plan.md), [evidence](../../specs/002-change-npm-to-pnpm/evidence.md).
