# Weave delivery plan: decision proposal

Research date: 2026-10-03. GitHub Spec Kit is chosen. This is an evidence-informed proposal; no GitHub/Linear/AWS configuration or deployment has been performed. The local directory is not currently a Git repository. Detailed sources and tool comparisons live in [release research](releases-and-traceability.md) and [container research](container-promotion.md).

## 1. Requirements recorded

- Spec Kit plus BDD discovery before implementation: happy, sad, and relevant edge scenarios agreed and identified.
- TDD: tests first, expected red, implementation, green, refactor; final convergence still required.
- Protected main and develop; ticket-prefixed working branches from develop; FEAT/FIX/BUGFIX/HOTFIX categories; no direct authored work on shared branches.
- One-line imperative Conventional Commits, including release automation messages.
- Linear ticket-to-spec-to-PR-to-release-to-deployment traceability.
- Frequent develop deployments without official SemVer increments.
- Main-only official versions, generated changelog/release notes, immutable container artifacts.
- Environment promotion without environment branches or rebuilds.

## 2. Recommended version model

Start with one Weave product version and two deployable images (web and API), bound together by a release manifest. Independent package versioning adds coordination work and is better introduced when independently shipped consumers require it. Future mobile binary releases need their own distribution/build identifiers and store workflows; they cannot be treated as Docker deployments.

Define the compatibility contract: backend API consumed by web/mobile, persisted data, and documented integrations. UI additions can be classified as product features, but do not mechanically label every visual change as an API-breaking major release. SemVer maps breaking API changes to major, compatible functionality to minor, and compatible bug fixes to patch; released version contents are immutable. Release grouping is orthogonal to project/epic planning. [SemVer](https://semver.org/).

Begin at 0.1.0 while contracts are experimental, or choose 1.0.0 when the public compatibility contract is intentionally stable. Configure pre-1.0 breaking-change behavior explicitly; different tooling settings can treat it differently. Promotions never change SemVer.

## 3. Branch flow

Normal path: ticket branch from develop → validated feature PR → develop → release-readiness PR → main. Feature PRs may squash to a single validated commit. Develop-to-main uses history-preserving merge, not squash, so repeated releases preserve ancestry and all release-impact commits remain available to analysis. Configure one-line merge messages; branch categories and commit types are separate.

Pin the release candidate source SHA. If develop advances while the release is under review, rerun candidate checks or use an automation-owned release-candidate branch at that SHA. A complete release needs its whole dependency-consistent snapshot; normal release selection is not cherry-picking a list of unrelated tickets.

Hotfix exception needed: a develop-origin HOTFIX branch includes develop's current ancestry. Releasing that branch wholesale can ship unfinished features. Safe recommendation is a narrow main-origin hotfix exception, tested and merged to main, then an automated backmerge PR into develop. If the user keeps all authored branches from develop, an automation-owned main-based patch branch can cherry-pick only the fix after dependency analysis and fresh CI. This is a deliberately reviewed exception path, not an invisible automation shortcut. Classic Gitflow itself starts hotfixes from the production branch, and its author notes other delivery models may fit continuous delivery better. [Original Gitflow model and reflection](https://nvie.com/posts/a-successful-git-branching-model/), [cherry-pick mechanics](https://git-scm.com/docs/git-cherry-pick).

## 4. Automated release tool

Recommend semantic-release for the strict requirement that a qualifying main merge triggers automated versioning and notes without a second release-PR merge. Configure release branches to main only and the Conventional Commits preset so one-line ! breaking markers are recognized. Disable npm publishing for private deployment apps. Analyze the full commit range since the prior release tag, taking the highest applicable impact. [semantic-release](https://semantic-release.org/intro/), [configuration](https://semantic-release.org/usage/configuration/).

Default tools may skip docs/chore/test-only changes. Decide whether every main source merge must create a patch or only changes affecting shipped behavior. Recommendation: every intended deployable main change gets an official release; classify ordinary non-breaking deployable changes as patch if no feature/breaking change is present. No-op maintenance merges should not produce artificial releases. Every main merge still generates a change report/cumulative changelog update, even when no new SemVer release is warranted. Validate this policy before merging main; do not silently depend on default release rules.

Release Please is the alternative if a reviewed, tracked CHANGELOG.md and package version bump are higher priority than immediate release on the first main merge. It updates a release PR and publishes when that PR merges, changing the requested cadence. Changesets suits separately versioned packages but introduces authored release-impact files. See the tool matrix in release research.

## 5. Changelog location and bot commits

Recommended default: generated GitHub release notes plus cumulative CHANGELOG.md attached as a durable release asset, keyed to the exact source SHA. No post-build source edits and no release bot pushing a new source commit after the images are built. If a tracked CHANGELOG.md is required, choose the release-PR model or prepare that file in an automation-owned PR before the final release source is built. Do not let documentation-only release commits trigger infinite patch releases.

Commit syntax: feat(api): add project sharing [WEV-123]; fix(api): reject duplicate names [WEV-124]; feat(api)!: remove legacy field [WEV-125]. One-line ! expresses breaking impact without a footer. Put detailed migration advice in PR/spec/release notes. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## 6. Main release orchestration

1. Release-readiness PR identifies candidate SHA, ticket list, scenario evidence, migrations, compatibility impact, and rollback constraints.
2. Required CI validates syntax, SDD artifacts, scenarios/tests, architecture, database integration, and production builds. Review confirms release scope.
3. The main merge starts one serialized release operation. Identify exact source SHA and compute next version.
4. Build web/API containers once; test/scan them; push by source identity to the registry and record their digests. Prepare the release-specific changelog and immutable manifest.
5. Publish the matching version tags, GitHub tag/release, and manifest when artifacts are available. These services are not an atomic transaction: retain workflow checkpoints and reconcile partial failures rather than claiming global atomicity.
6. Deploy the recorded digest pair to QA/staging, run migrations and acceptance smoke checks, then promote the same pair to production if gates pass.
7. Record deployment result and update Linear release stage only after deployment health succeeds. Creating a release does not mean production deployment succeeded.

Use one reusable release workflow with explicit job dependencies. Serialize official releases without cancelling a partially publishing operation. Idempotency keys include source SHA/version/digest; a retry reuses completed artifacts and does not rewrite published versions. A tag-triggered downstream pipeline needs explicit supported dispatch/authentication; never assume bot-created events will trigger new workflows.

## 7. Develop deployment

Develop push → CI → image build → deploy to dev. Use dev-<sha> tags and deploy by digest, with commit and workflow provenance. Do not run release tooling or alter product version files. If develop deployments are validated in QA, label them as dev candidates; final release QA must validate the actual main-built artifacts. A merge commit produces a different source identity from develop, even if file contents match.

## 8. Enforcement and limits

- commit-msg + CI: Conventional Commit parser, exactly one nonempty line, branch ticket/type format, PR ticket/spec links. Imperative grammar remains a review responsibility.
- Required status checks: scenario mapping, unit/component/integration/journey tests, lint/type/build, architecture/DI, migration tests, secrets/dependency/image checks.
- Agent workflow: no implementation until scenario coverage is agreed; per-task behavioral red evidence before green; final convergence report.
- GitHub protections: no direct working pushes to main/develop, required PR/checks, constrained automation identities.
- Promotion: manifest digest equality, prior-environment success, runtime configuration revision, migration compatibility, environment-scoped credentials, health checks, deployment audit record.
- Tests passing at the end cannot prove they were written first. Preserve trustworthy red/green evidence, review it, and consider a base-commit regression check where practical.

## 9. Decisions before implementation

- Native Linear Releases plan availability and actual ticket prefix/repository identity.
- Main-based hotfix exception versus explicit patch extraction automation.
- EC2 (simplest hosting) versus ECS/Fargate (managed container scheduling).
- Artifact/GitHub changelog versus committed CHANGELOG.md with release PR cadence.
- Initial 0.1.0 versus stable 1.0.0 and exact release-impact rules.
- QA-to-production auto-promotion after tests versus an explicit approval gate. Either can avoid repetitive manual deployment work; approval is a policy decision.

No infrastructure can be configured responsibly until host/account/environment identities exist. The first implementation can set up local standards, tests, Spec Kit, commit validation, Dockerfiles, and repository workflows, with remote integrations completed against the chosen repository and accounts.
