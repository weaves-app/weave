# Implementation Plan: Mobile Local State

**Branch**: `feat/WEA-27/zustand-local-store` | **Date**: 2026-10-15 | **Spec**: [spec.md](spec.md)

**Input**: `specs/004-zustand-local-store/spec.md` — WEA-27

## Summary

Replace the auth controller's handwritten state/listener storage with an app-root-scoped Zustand vanilla adapter. Keep commands, session authority, revision/generation checks, timeout handling and transitions in the framework-free controller. React consumes a read-only state contract through selected subscriptions. Provider effect setup allocates and starts each runtime; cleanup terminates it, and replay or recovery Reload allocates a fresh instance; secrets and component-local form values never enter the store. No persistence middleware or global store instance.

This document completes research and design only. The user requested planning on 2026-10-15; this does not constitute S01–S07 confirmation or authorize implementation without the remaining workflow gates.

## Technical Context

**Language/Version**: TypeScript 6.0.3; React 19.2.3; React Native 0.86.3; Node 24 LTS recommended by repository.

**Primary Dependencies**: Latest stable Zustand vanilla store and React `useStore` (verified 5.0.15 on 2026-10-15; recheck at installation and save exact resolution); existing React Navigation 7.5.0/native-stack 7.20.0 and native Clerk bridge retained.

**Storage**: In-memory presentation state only. Existing native secure storage remains authoritative; no new disk schema, hydration or backend writes.

**Testing**: Jest 29.7 / RN preset / Testing Library RN 13.3; existing gateway and clock fakes, native contract suites, Metro bundles and native compilation. Tests use real Zustand stores; fake the authentication authority and clock.

**Target Platform**: Android API 24+ and iOS 17+, as committed in native projects. Zustand adds no native module.

**Project Type**: Vanilla React Native app inside pnpm 11.1.1 monorepo.

**Performance Goals**: Zero selected-consumer updates for 100 changes that preserve its selected value; zero old-lifetime effects over 20 root resets. No unmeasured latency or frame-rate claims.

**Constraints**: One writable snapshot authority per lifetime; framework-free inner layers; interface injection and canonical factory/token; preserve public auth behavior and semantic constants. Native session IDs/account IDs are ephemeral summaries, never credentials. Parent live acceptance gaps remain open.

**Scale/Scope**: One existing auth bounded feature, Login/Home/navigation/recovery consumers, one production store per mounted app root. No unrelated feature stores or generic state framework.

## Constitution Check

_Pre-research and post-design assessment, 2026-10-15._

| Gate                                     | Before research                               | After design                                                                                           |
| ---------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Dedicated ticket/spec and active feature | Pass: WEA-27, feature.json points here        | Pass; no WEA-10 artifact reuse                                                                         |
| BDD agreement before source edits        | Pending implementation gate; S01–S07 proposed | Still pending; planning authorized by explicit speckit-plan invocation; no source edits                |
| Meaningful TDD and traceability          | Required during implementation                | Planned per-scenario RED/GREEN/refactor; mapping in contracts/scenario-tests.md                        |
| Framework-free domain/application        | Pass design constraint                        | State port contains only domain values and functions; Zustand imports confined to adapter/presentation |
| Interface dependencies and wiring        | Pass design constraint                        | AuthStateStore interface, AUTH_STATE_STORE token and createAuthRuntime composition factory             |
| Reused UI/accessibility/tokens           | Pass                                          | No new controls or design variants; regression/device checks retained                                  |
| Branch from develop                      | Explicit user exception: stack on PR #11      | Branch based on parent head c9998b4, whose base is develop; no protected-branch edits                  |
| Personal identity and publishing         | Existing local personal identity observed     | Reverify author/committer before publishing; required checks/review still apply                        |
| Release/configuration boundaries         | Pass                                          | No deployment, credential provisioning or release changes                                              |

The effect-owned activation contract resolves allocation, cleanup and development replay without reusing disposed instances. Runtime ownership tests precede initial runtime implementation. No unresolved technical clarifications or unjustified design violations. Implementation remains gated on scenario agreement, tasks and analysis. The local SDD commit hook requires completed later-phase artifacts and agreement; do not fabricate them or report the hook as passing. `setup-plan.sh` reports the feature basename as BRANCH when feature.json supplies context; actual Git branch was independently verified above.

## Project Structure

### Documentation (this feature)

```text
specs/004-zustand-local-store/
├── spec.md
├── workflow.json
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── local-state.md
    └── scenario-tests.md
```

`tasks.md`, behavioral evidence and convergence belong to subsequent commands; not fabricated in planning.

### Source Code (repository root, proposed)

```text
apps/mobile/
├── App.tsx                                  # existing composition entry, inject runtime factory
├── package.json                             # exact Zustand production dependency
└── src/auth/
    ├── domain/auth-models.ts                # existing AuthViewState, unchanged semantics
    ├── application/
    │   ├── auth-state-store.ts              # new reader/writer interfaces and initial-state factory
    │   └── auth-controller.ts               # inject port, delegate snapshot/subscription storage
    ├── infrastructure/zustand-auth-state-store.ts # vanilla adapter
    ├── auth-runtime.ts                     # composition factory and runtime contract
    ├── auth.tokens.ts                      # add canonical state token
    ├── presentation/auth-context.tsx        # lifetime/context wiring; selected hook
    └── testing/fakes.ts                     # fresh state fixture per controller
pnpm-lock.yaml                              # frozen-install compatible dependency resolution
```

Adjacent behavioral tests cover the state adapter, selector hooks, controller, runtime and recovery. Existing navigation/Home consumers switch to focused selectors; Login may select the full snapshot because it uses all fields. `App`'s internal injected test factory may move from createController to createRuntime; update existing tests to exercise the same observable outcomes, including render-fault recovery.

**Structure Decision**: Retain the auth feature boundaries and existing shared primitives. State lifecycle is composed in one runtime, avoiding controller-to-store mirroring or a module singleton. No new workspace package or native configuration changes.

## Implementation Sequence and Validation

1. Confirm S01–S07 in workflow.json; generate tasks and run analyze before source changes.
2. Add the exact Zustand dependency/lock resolution. Prove tooling imports separately; an import failure is not behavioral RED.
3. Define the state port and fresh initial-state factory; write contract tests with real adapter instances before adapter behavior. Record unsubscribe, replacement, disposal and instance-isolation RED/GREEN.
4. Inject the port into the controller. Eliminate the old mutable snapshot and Set of listeners. Re-read current state at async completion boundaries; preserve all existing command/state-machine guards. Run controller regression tests after this slice.
5. Execute runtime ownership and provider activation tests to behavioral RED before composing the runtime. Allocate only in effect setup, show existing session-checking feedback until binding, and dispose each activation on cleanup; replay allocates anew. Compose runtime and selector hooks; migrate consumers. Write selected-render and runtime-reset behavioral tests before their implementations. Preserve recovery fault injection at the reader seam.
6. Exercise all scenarios and full existing mobile suite; perform 100 unrelated updates and 20 resets. Verify restart/privacy with captured adapter state and both-platform user journeys.
7. Run repository verification, database integration, native tests/compiles and live acceptance where available. Record unrun checks honestly, converge and publish a draft stacked PR against the parent branch with spec/evidence links. Retarget develop after the parent merges; never merge or bypass required review implicitly.

See [research](research.md), [state contract](contracts/local-state.md), [scenario mapping](contracts/scenario-tests.md) and [validation guide](quickstart.md).

## Complexity Tracking

No extra architectural exception. The consumer-owned state port is necessary to keep Zustand out of application code; its narrow surface replaces existing handwritten storage. The stacked branch exception is explicitly authorized by the user and recorded above.
