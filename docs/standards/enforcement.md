# Enforcement

## Is this industry standard?

Written conventions, modular boundaries, dependency inversion, automated validation, and reviewed delivery are established engineering approaches. The exact combination of Google TypeScript rules, interface-only injection, DDD/Clean Architecture everywhere, and a particular AI SDD toolkit is a project choice, not an industry-wide standard. Official framework documentation describes supported practices, not evidence that most companies adopt this exact package. No representative adoption survey or causal productivity benchmark was established in this research.

## Rule ownership

One authoritative policy per concern: root AGENTS.md is the entry point; docs/standards owns details; app-level AGENTS.md selects relevant guidance; the selected SDD constitution references the same policies. Record architecture decisions and explicit exceptions in ADRs. Avoid divergent copies across Codex, Copilot, and Cursor instruction files; small adapters can point to the canonical documents. Verify each agent actually loads its adapter.

## Enforcement matrix

| Requirement           | Proposed enforcement                                                                               | Limit                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Follow chosen SDD     | Installed agent integration, versioned artifacts, PR spec/task references, acceptance traceability | File existence cannot prove correct reasoning               |
| Google TS conventions | Formatter, explicit ESLint rule mapping, review                                                    | Framework exceptions and non-mechanical guidance remain     |
| Safe types/promises   | Strict compiler and typed lint rules                                                               | Runtime inputs still need validation                        |
| Dependency direction  | TypeScript-resolved import/constructor analysis and cycle checks                                   | Alias/generated/dynamic imports need correct coverage       |
| Interface-first DI    | AST check for authored injection parameters and token bindings; wiring tests                       | Structural type correctness does not prove contract quality |
| SOLID/DDD/DRY         | Review checklist, contract tests, boundary checks, ADRs                                            | Not fully decidable with static analysis                    |
| Consistent UI         | Token rules, component catalogue, component/visual/accessibility tests                             | Visual quality needs design review                          |
| Correct behavior      | Requirement-linked unit, integration, contract, and journey tests                                  | Generated tests can repeat mistaken assumptions             |

[dependency-cruiser](https://github.com/sverweij/dependency-cruiser) supports configurable dependency validation. [Typed linting](https://typescript-eslint.io/getting-started/typed-linting/) adds type-aware checks. [Protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) can require successful status checks before merge. Local hooks help developers but are bypassable; use CI as the authoritative gate. GitHub repository settings must be configured separately from checked-in YAML.

## Recommended rollout (GitHub Spec Kit selected)

1. Pin the chosen toolkit release and install its verified Codex integration into the existing repository, preserving existing files. Review generated commands, templates, scripts, and capabilities. Do not initialize a second application.
2. Write the project constitution from these standards, with explicit compatibility exceptions. Record the SDD decision and define feature-size-appropriate workflows. New behavior requires a spec; fixes link existing acceptance criteria or a scoped correction artifact.
3. Adopt root/scoped agent instructions and lint/format configuration. Add a rule-to-tool mapping showing which Google rules are automated and which require review.
4. Add architecture and DI checks, test tooling, and CI. Proposed check suite: format, lint, typecheck, boundaries, unit/component tests, PostgreSQL migration/integration tests, critical browser tests, builds, and SDD artifact/traceability validation.
5. Refactor the health slice and API client as the first SDD feature. This validates plain application code, interface/token wiring, a real PostgreSQL test, and reusable web UI without inventing business domains.
6. Configure required CI checks/review on the repository host. Establish the mobile design-system spec when the mobile app is authorized.

Review specification and design before implementation. Keep artifacts small and update the source owning a change; do not regenerate unrelated documents. Define measurable acceptance scenarios and map them to tests. Separate requirement decisions from the technical plan. Resolve material unknowns before implementing their dependent tasks; independent work may continue.

## Current status

Spec Kit v1.1.0, root/scoped AGENTS.md, constitution, shared lint/format, architecture/DI checks, behavioral tests, Git/Codex hooks, CI and CODEOWNERS are installed by WEA-6. See [Google rule mapping](google-rule-mapping.md), [hooks](hooks.md), [automation](automation.md) and the feature evidence/convergence for verified status and limits. Repository rulesets are configured separately; no file alone proves hosted enforcement. Audit findings are disclosed in [dependency security](dependency-security.md).

## Additional accepted requirements

Use [TDD and BDD](testing-and-delivery.md) before implementation. Release design is documented in the [delivery proposal](../research/weave-delivery-plan.md); GitHub delivery automation is implemented; AWS/Linear release integrations remain unconfigured.
