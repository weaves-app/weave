# Release automation and Linear traceability

Research checked on 3 October 2026. This is a proposed design, not installed configuration. Product behavior below is sourced; recommendations are project-specific judgments.

## Decisions supported by the evidence

- A planned business release is a collection of work; a SemVer version identifies the compatibility impact of a software artifact. One planned release can deliver several artifacts. SemVer requires defining the public API and uses major for incompatible changes, minor for compatible functionality, patch for compatible fixes. Released versions must not be modified. Decide when Weave promises a stable contract rather than treating `0.x` as a substitute for compatibility decisions. [SemVer specification](https://semver.org/)
- Conventional Commits supports a one-line header and an optional body/footer. `feat`, `fix`, and a `!` breaking marker convey version intent. Imperative wording and forbidding bodies are additional Weave policies, not requirements of that specification. Examples: `feat(auth): add sign-in WEAVE-123`; `fix(api): reject expired sessions WEAVE-124`; `feat(api)!: remove legacy login WEAVE-125`. The ticket follows the subject so the conventional type stays at the start. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- Linear now has native Releases, with CI-linked issues, environments/pipelines, release notes and changelogs. It is available on Business and Enterprise; Business supports up to 15 pipelines. Pipelines support continuous or scheduled operation and monorepo path filters. A pipeline access key is required; a personal API key cannot replace it. This is a current verified product capability, superseding older discussions suggesting Linear lacks releases. [Linear Releases](https://linear.app/docs/releases)

## Release tools compared

| Tool             | Sourced behavior                                                                                                                                         | Assessment for Weave                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| semantic-release | Determines versions and publishes release notes automatically in CI; release branches/plugins are configurable.                                          | Best fit for a release immediately after a successful release-batch merge to main. Use only main as a release branch. Disable npm publishing for private applications.                                        |
| Release Please   | Maintains a release PR containing version/changelog changes, then creates a release when that PR merges. It supports manifest-based multiple components. | Good when the release PR is the release approval mechanism. Adds a second merge after the batch reaches main and introduces a bot branch outside the ticket-working-branch policy unless explicitly exempted. |
| Changesets       | Developers record affected packages, bump types and summaries in changeset files; its action can create a version PR and publish.                        | Good for independently published package libraries. Adds per-change metadata and a version PR; less direct for the requested commit-derived application release.                                              |

Sources: [semantic-release overview](https://semantic-release.org/), [configuration](https://semantic-release.org/usage/configuration/), [Release Please action](https://github.com/googleapis/release-please-action), [manifest releases](https://github.com/googleapis/release-please/blob/main/docs/manifest-releaser.md), [Changesets](https://changesets-docs.vercel.app/), [Changesets action](https://github.com/changesets/action).

Recommended semantic-release plugins: conventional commit analyzer using the Conventional Commits preset, release-notes generator, GitHub release publisher, and a narrowly scoped integration for container/manifest publication. Verify parser behavior with `feat!:` and `fix!:` fixtures before enabling releases. Its analyzer supports custom release rules and takes the highest relevant release impact across commits. [Commit analyzer](https://github.com/semantic-release/commit-analyzer)

## Branch design

Recommended naming: `WEAVE-123/FEAT/add-sign-in`, `WEAVE-124/FIX/reject-expired-token`, `WEAVE-125/BUGFIX/repair-navigation`, `WEAVE-126/HOTFIX/repair-login`. The team key is illustrative; replace it with the real Linear identifier. FIX and BUGFIX can share the same release behavior.

1. Create normal ticket branches from develop; PRs target develop.
2. Squash short-lived ticket PRs into develop with a validated one-line conventional PR title as the commit message. Set GitHub's squash default to title only and validate the eventual merge message.
3. Create a release PR from develop to main, capturing the exact batch of included issues, commits and specifications.
4. Merge this long-lived branch with a merge commit, preserving its individual conventional commits; use a one-line message such as `chore(release): ship approved release batch`.
5. Protect both long-lived branches; forbid direct human pushes and force pushes. Only release PRs may target main, with a narrowly defined hotfix exception if chosen.

GitHub documents that squash merging a continuing branch can make previously squashed commits reappear and increase conflict risk; merge commits preserve the original history. Therefore do not squash develop into main. [GitHub merge strategies](https://docs.github.com/en/pull-requests/reference/pull-request-merges)

Branch names and PR bases can be checked automatically. Proving that a branch was originally created from develop needs a controlled branch-creation script and recorded creation SHA; current Git ancestry alone cannot reliably prove creation history.

## Important release choices

- **Batch scope:** merging develop to main ships everything in that ancestry. Normal cherry-picking increases selection/dependency bookkeeping and should not be the standard release path. Keep develop releasable; use feature flags to conceal unfinished capabilities. Exclude disabled work from customer-facing notes only under an explicit policy, while retaining it in technical provenance.
- **Urgent hotfix conflict:** if develop contains unreleased work, “every working branch starts from develop” cannot safely give an isolated production fix simply by merging that branch into main. Choose an explicit exception: hotfix branches from the released main/tag, then merge/backport the fix to develop. If the strict rule is retained, a bot can cherry-pick an independently tested fix onto a main-based release branch, but that branch also needs an exception and introduces new-SHA provenance. Do not silently implement either exception.
- **One version initially:** recommend a single Weave product SemVer plus a release manifest containing separate web/API digests. It is simpler for coordinated web/API delivery. Independent versions become useful when services or mobile ship separately; monorepo membership alone does not require identical versions. Define the public compatibility contract and backward-compatible API window before adding independently deployed mobile clients.
- **Non-user-facing merges:** default conventional analysis may produce no new version for docs/chore/test-only commits. Still generate a main-merge changelog/report. Decide whether these merges should create no deployable release (recommended), or force a patch under an explicit custom policy. “Every merge has a changelog” does not inherently mean “every merge changes SemVer.”

## Proposed automated pipeline

1. Ticket PR: check branch/ticket/spec links, single-line conventional messages, BDD/TDD evidence, lint/types/boundaries/tests/builds.
2. Develop merge: build a development image keyed by full SHA/run; deploy dev freely. No SemVer release, production tag or version increment.
3. Release PR: generate proposed version, notes, included issues, compatibility warnings and specification links; run complete acceptance checks on the exact release candidate.
4. Main merge: serialize release runs; validate exact SHA; calculate the release version; build web/API containers once; record digests, SBOM/provenance and checks. Publish the immutable version tag and GitHub Release only after required artifact checks succeed.
5. Attach generated changelog and release manifest to the GitHub Release. Maintain a cumulative published changelog, including a main-merge report when no new SemVer release results.
6. Promote exact digests to QA, then production after configured gates. Update Linear only after the environment deployment succeeds. GitHub release creation means artifact publication; Linear production completion means customer delivery.
7. Retry using the original SHA, version and digests. Detect already-created tags/releases/images before publishing; never overwrite a failed or successful version with different contents. Resume partial publication safely.

This sequence is a recommended integration architecture, not a claim that one off-the-shelf tool makes registry publication, GitHub releases and deployment transactional. The release workflow must explicitly handle partial failures and retries.

## Changelog storage trade-off

Generate changelog content automatically on every main merge, but avoid pushing a second changelog-only commit directly to protected main. That creates another main event, bot bypass requirements and synchronization work with develop. GitHub release notes/assets or a generated documentation site satisfy automated publication without repository mutation. If a committed `CHANGELOG.md` is mandatory, choose Release Please's reviewed version PR or define a bot-commit exception and loop guard. semantic-release offers a changelog-file plugin and a Git plugin that commits release assets, but this is an extra behavior that must be designed deliberately. [Changelog plugin](https://github.com/semantic-release/changelog), [Git plugin](https://github.com/semantic-release/git)

Do not rely on a release-tag event created by `GITHUB_TOKEN` to launch the deployment workflow. Current GitHub docs suppress most token-generated events; dispatch events are exceptions and certain PR events create approval-required runs. A GitHub App token allows automatic event-triggered workflows. Prefer one orchestrated workflow/reusable jobs for release and promotion, or explicit dispatch, to make dependencies visible. [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)

## Linear integration and immutable traceability

Use native GitHub integration to link PRs/issues. Ticket IDs must remain in squash commit subjects even when branch refs disappear. Distinguish merged work from released work; configure the relevant status automation accordingly. [Linear GitHub integration](https://linear.app/docs/github)

Linear's official CLI scans commits and PR references, supports scheduled pipeline stages through `sync`, `update`, and `complete`, accepts `--release-version`, links/documents/release notes, and allows an exclusive `--base-ref` for precise scan boundaries. Use a pinned CLI/action and full Git history. Store the previous released SHA explicitly so retries/promotions do not rediscover a different batch. For example, sync version `1.2.0` with a GitHub Release link, update QA after successful QA deployment, then complete it after production succeeds. A continuous dev pipeline may use SHA identifiers separately. [Linear release CLI](https://github.com/linear/linear-release), [official action](https://github.com/linear/linear-release-action)

Proposed release-manifest fields:

```json
{
  "version": "1.2.0",
  "sourceSha": "full-main-commit-sha",
  "previousReleaseSha": "full-previous-release-sha",
  "gitTag": "v1.2.0",
  "issues": ["WEAVE-123", "WEAVE-124"],
  "pullRequests": [42, 43],
  "specifications": ["specs/001-sign-in/spec.md"],
  "images": {
    "web": "registry/weave-web@sha256:...",
    "api": "registry/weave-api@sha256:..."
  },
  "migrationRevision": "202610030001_initial",
  "workflowRunUrl": "https://github.com/owner/Weave/actions/runs/123",
  "testEvidenceUrl": "artifact-url",
  "sbomUrls": ["artifact-url"]
}
```

Record promotions separately as append-only deployment records containing version, digest(s), target environment, deployment ID, timestamp, configuration revision, outcome and previous release. Environment promotions must not alter the release manifest. The complete chain is Linear issue → specification/scenarios → PR → source SHA → SemVer tag → image digests → environment deployment.

## Decisions needed before implementation

- Confirm Linear plan and real team key.
- Confirm single product version initially and public compatibility contract.
- Confirm hotfix exception to develop-only branch creation.
- Confirm published changelog versus committed `CHANGELOG.md`.
- Choose production gate: automated health checks only, or explicit deployment approval.
- Confirm no SemVer bump for non-release main merges, while always publishing their change report.

No external service configuration, release tooling, branches or deployment automation were installed by this research.
