# Testing and delivery requirements

Recorded 2026-10-03. User requirements are adopted. GitHub Spec Kit v1.1.0 and workspace enforcement tooling are installed by WEA-6.

## BDD before implementation

1. Brainstorm the feature with the user before implementation.
2. List happy paths, sad paths, boundaries, permissions, invalid inputs, missing data, duplicates, timeouts/dependency failures, and relevant concurrency/offline scenarios. Mark non-applicable categories with a reason.
3. Write scenario IDs and Given/When/Then outcomes in the feature specification. Resolve material questions and agree the coverage before implementing.
4. Map every agreed scenario to an automated test or an explicit manual check with justification. New discoveries update scenarios before dependent implementation.

BDD is discovery, formulation, and automation around shared examples, rather than merely a test syntax. [Cucumber BDD](https://cucumber.io/docs/bdd/). Gherkin supports scenarios and outlines with example tables. [Gherkin reference](https://cucumber.io/docs/gherkin/reference/).

Coverage means the agreed behavior and risks are represented; no finite checklist proves every possible case. Code coverage percentages are not scenario completeness. Cucumber is optional; readable Given/When/Then tests can initially use the chosen test runner without an additional step-definition layer.

## TDD during implementation

For each behavior: write a meaningful test first, execute it and confirm it fails for the expected missing behavior, implement the minimum code to pass, then refactor while green. Do not write the implementation first and retrofit tests. Bug fixes first reproduce the defect. Final Spec Kit verification/convergence remains mandatory.

The red-green-refactor loop is established TDD practice. [TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html).

Record scenario ID, failing command/result, passing command/result, and relevant commit or CI reference in feature evidence. Avoid fabricated logs. CI runs the final tests and validates scenario links; it cannot independently prove temporal ordering from a squashed final diff. A stronger optional check runs newly added regression tests against the pre-change base to confirm red, with accommodations for genuinely new APIs/test harnesses. Failure for a syntax/import/tooling mistake is not behavioral red evidence.

Spec Kit tasks must order scenario discovery/acceptance before tests, tests before dependent implementation, then refactoring and final verification. Agent completion checks require evidence. Review verifies test meaning and the actual TDD sequence.

## Branches and commits

User branch model: protected main and develop; authored working branches start from develop; no direct development on either shared branch. Branch grammar: feat|fix|bugfix|hotfix/WEA-N/short-description, for example feat/WEA-123/add-project-filter. Branch categories and Conventional Commit types are lowercase.

One-line imperative commits only, e.g. feat(web): add project filter [WEA-123] or fix(api): reject duplicate project names [WEA-124]. Use ! for breaking changes, e.g. feat(api)!: remove legacy project field [WEA-125]. Breaking migration details belong in the spec, PR, and release notes, not multiline commit bodies. Conventional Commits permits ! in the header and optional bodies/footers; the one-line rule is Weave-specific. [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

Local commit-msg hook and CI validate syntax and forbid bodies/footers; imperative wording requires review because regex cannot reliably infer grammar. Merge and automation commit subjects must also be one line, with narrow documented ticket exemptions for release/backmerge automation. Feature PRs can squash into develop with a validated one-line PR title and empty commit body. Preserve history when merging develop into main and main back into develop; configure merge messages to one line. Do not squash the long-lived branch release merge.

A hotfix branch from develop can inherit unrelated unreleased work. This conflict must be resolved before release automation: either release the complete eligible develop snapshot, use feature flags with their runtime state recorded, or authorize a main-based hotfix/automated patch extraction path with full dependency testing. Never pretend a full develop merge selects only the named ticket.

## Release boundaries

Only main produces official SemVer releases. Develop deployments use immutable source identifiers, not official version increments. Environments are deployment targets, never QA/prod branches. A release may contain multiple tickets, projects, and features; SemVer describes compatibility impact rather than the count or size of epics.

See the research documents for release tooling, Linear linkage, container hosting, promotion, and rollout. This document owns requirements; hooks/automation and repository rules implement mechanical checks. Linear release synchronization and AWS deployment remain separate environment decisions.
