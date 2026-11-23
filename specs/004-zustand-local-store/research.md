# Research: Zustand Mobile Local State

WEA-27 · 2026-10-15 · Phase 0 complete; implementation not started.

## Dependency and compatibility

**Decision**: Use the latest stable Zustand release at implementation time, as requested by the user. The npm latest tag was verified on 2026-10-15 as 5.0.15, matching the official latest GitHub release. Resolve latest again when installing, save the resolved version exactly in @weave/mobile and update pnpm-lock.yaml. No install is performed by planning.

**Rationale**: The [official release](https://github.com/pmndrs/zustand/releases/tag/v5.0.15) and [tagged package manifest](https://github.com/pmndrs/zustand/blob/v5.0.15/package.json) provide the version-specific reference, RN export conditions and React >=18 peer compatibility. The existing React 19.2.3 and TypeScript 6.0.3 satisfy the documented bounds. Normal useStore does not require the optional traditional equality dependency. This is a compatibility assessment, not proof of Metro/native runtime behavior; verify both bundles and app builds after adoption.

**Alternatives considered**: Keeping a stale fixed selection would not honor the user request. Resolve latest at installation, then retain an exact manifest version and lockfile for reproducibility; Zustand 4 is unnecessary for the current React version; alternative libraries do not honor the user's explicit choice.

## Root-scoped construction

**Decision**: One vanilla createStore instance per runtime, supplied through typed React Context. Allocate it in each AuthProvider effect setup under the existing recovery boundary. Render neither allocates the runtime nor starts native work; it uses existing session-checking feedback until the active binding is ready. Cleanup is terminal, and development replay creates a fresh instance as defined in contracts/local-state.md.

**Rationale**: Official [initialization with props guidance](https://zustand.docs.pmnd.rs/learn/guides/initialize-state-with-props) uses vanilla stores and Context to inject a stable scoped instance. This fits independent app lifetimes, fake dependencies and recovery Reload.

**Alternatives considered**: A module-level create hook shares state across roots/tests; a universal cross-platform store would broaden scope without user value.

## Architecture and sole state authority

**Decision**: Inject a consumer-owned state port into createAuthController; the controller delegates snapshot reads/subscriptions and replaces accepted snapshots through that port. Concrete construction stays in createAuthRuntime, wired from App.

**Rationale**: The [vanilla API](https://zustand.docs.pmnd.rs/reference/apis/create-store) offers synchronous getState/setState/subscribe/getInitialState without React. A structural reader can also be passed to [useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store). Keeping third-party types out of the application port is a repository-specific architectural decision derived from the constitution. State transition rules and native session authority remain in existing owners.

**Alternatives considered**: Importing Zustand in application code violates the inner-layer policy; mirroring controller state creates a second representation and ordering risks.

## Full replacement semantics

**Decision**: Use setState(next, true) for complete accepted AuthViewState snapshots. Do not shallow merge.

**Rationale**: Existing publish(next) replaces the entire snapshot. selectMethod deliberately omits error; default shallow merging could retain obsolete optional error fields. Zustand [v5 migration guidance](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) requires a full state for replace:true, matching the existing domain shape.

**Alternatives considered**: Patches/merge with explicit undefined per optional property are fragile and change the controller's existing contract.

## Selectors and rendering

**Decision**: useAuthSelector uses ordinary useStore with Object.is-selected values. Prefer scalar values and immutable nested references. Use useShallow only for a necessary aggregate; preserve whole-state compatibility where Login already consumes all fields.

**Rationale**: [useStore](https://zustand.docs.pmnd.rs/reference/hooks/use-store), [shallow selector guidance](https://zustand.docs.pmnd.rs/learn/guides/prevent-rerenders-with-use-shallow), and [v5 migration guidance](https://zustand.docs.pmnd.rs/reference/migrations/migrating-to-v5) support selected subscriptions and warn against unstable selector outputs. Measure store-driven committed consumer updates after mount, not render invocations caused by parents/development tooling. Raw vanilla subscribe sees changed full snapshots; it is not the SC-004 seam.

**Alternatives considered**: Whole-state subscriptions everywhere lose S06's value; traditional custom equality adds an unnecessary dependency; fresh aggregate selectors risk unstable snapshots.

## Cleanup, restart and credentials

**Decision**: Runtime disposal stops controller/gateway work and then closes its adapter and owned subscribers. Reload creates a fresh instance. No persist/devtools middleware or generic logout/reset action.

**Rationale**: [Tagged vanilla source](https://github.com/pmndrs/zustand/blob/v5.0.15/src/vanilla.ts) exposes subscribe unsubscribe functions and no destroy API; [tagged React integration](https://github.com/pmndrs/zustand/blob/v5.0.15/src/react.ts) uses useSyncExternalStore. Explicit ownership and callback rejection therefore remain required. Existing native secure storage owns session persistence; component-local password/code fields remain in useLogin.

**Alternatives considered**: Persisting local state conflicts with scope and introduces hydration races; relying on nonexistent destroy would fail cleanup; reusing a reset store lets old references reach the current root.

## Resolved research questions

Dependency policy: latest stable at installation; currently verified 5.0.15. API surface: vanilla createStore plus React useStore. Ownership: root-scoped runtime. Replacement: complete snapshots. Equality: Object.is. Persistence: none. Dependency injection: application interfaces and composition factory. No unresolved technical clarification remains. User scenario confirmation and later task/analysis gates remain separate workflow prerequisites.
