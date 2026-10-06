# Feature Specification: Change npm to pnpm

**Feature Branch**: `feat/WEA-8/change-npm-to-pnpm`
**Created**: 2026-10-04
**Status**: Approved for implementation
**Input**: Migrate the workspace to pnpm; implement the scope recorded in Linear.
**Ticket**: [WEA-8](https://linear.app/weaveapp/issue/WEA-8/change-npm-to-pnpm)

## User Scenarios & Testing

### User Story 1 - Reproducible developer workspace (Priority: P1)

Developers install and run all existing applications with one package manager.
**Why this priority**: This is the foundation for every other workflow.
**Independent Test**: Clean installation, workspace resolution, verification and database integration.

1. **S01 Given** a clean checkout and the pinned toolchain, **When** `pnpm install --frozen-lockfile` runs, **Then** all workspaces install reproducibly and required generation/hooks work.
2. **S02 Given** installed dependencies and PostgreSQL, **When** verification and database integration run, **Then** all applicable checks pass.
3. **S03 Given** a manifest inconsistent with the lockfile, **When** CI performs a frozen install, **Then** it fails without modifying the lockfile.

### User Story 2 - Build all deployment targets (Priority: P1)

Maintainers build web/API images and native mobile artifacts using the same workspace.
**Why this priority**: A migration must preserve deployable applications.
**Independent Test**: Pruning, production images, Metro bundles and available native compiles.

1. **S04 Given** each pruned web/API workspace, **When** its Docker image builds, **Then** dependencies and generated assets resolve and the application starts.
2. **S05 Given** the pnpm workspace, **When** Metro bundles and available Android/iOS checks run, **Then** native/shared dependencies resolve with matching React/renderer versions. Record unavailable native prerequisites explicitly.

### User Story 3 - Preserve maintenance enforcement (Priority: P2)

Maintainers keep hooks, audits and bot-adoption rules usable after migration.
**Why this priority**: Prevent weakening existing delivery gates.
**Independent Test**: Public proposal validator, CLI hooks, CI workflow lint and audit report processing.

1. **S06 Given** the migrated repository, **When** policy hooks, adoption, audit and CI run, **Then** they accept pnpm inputs and retain existing enforcement.

### Edge Cases

- Frozen installs reject missing/stale lockfiles; shared packages resolve locally, never from registry.
- React, React DOM and test renderer remain version aligned; native paths remain valid.
- Registry failures fail installation; audit errors fail reporting rather than masquerading as clean audits.
- Bot adoption permits dependency manifests/lockfiles/Action pins only; application source and workspace policy changes remain rejected.
- No new UI, authentication, permission or business concurrency behavior; these categories are not applicable.

## Requirements

### Functional Requirements

- **FR-001**: Pin pnpm and make one workspace lockfile authoritative; preserve existing dependency versions wherever import permits.
- **FR-002**: Developers can invoke every existing script and local hook with pnpm, including forwarded database/native arguments.
- **FR-003**: CI uses frozen installs and retains cache, audit, quality, integration and native gates.
- **FR-004**: Web/API images preserve production dependency resolution and runtime health.
- **FR-005**: Mobile bundles and available native compilation preserve workspace resolution and renderer alignment.
- **FR-006**: Bot adoption accepts pnpm dependency lockfile updates without expanding its allowed policy scope.
- **FR-007**: Active documentation describes the migrated workflow; historical evidence remains intact.

## Success Criteria

### Measurable Outcomes

- **SC-001**: One clean installation supports all six workspace packages and root tooling, with zero unexpected registry lookups for local packages.
- **SC-002**: All locally applicable verification and integration checks pass; unavailable platform prerequisites have explicit evidence.
- **SC-003**: A stale-manifest fixture fails installation and leaves its lockfile unchanged.
- **SC-004**: Every scenario has an automated result or a justified manual/environment-limited check.

## Assumptions

- User approved the ticket description and scenarios with “ok implement” on 2026-10-04.
- Preserve the existing hoisted native layout; migration does not introduce dependency upgrades, deployments or release-policy changes.
- Node 24, network access, Docker and native SDK availability are environment prerequisites, not changes to the application contract.

## Clarifications

2026-10-04: Coverage scan found no material unresolved product decisions. Package-manager version/linker/bootstrap are implementation choices. Existing build/review/security gates remain mandatory.

2026-10-07 PR remediation: retain the existing S01-S06 contract. Package-age configuration documents pnpm 11.1.1's default 24-hour preference with non-strict fallback; a strict package-age gate is outside this migration. Frozen installs preserve the locked graph. Post-merge Dependabot regeneration requires operational verification rather than an assumed support claim.
