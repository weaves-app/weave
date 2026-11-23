# Local State and UI Contracts

WEA-27 · 2026-10-15 · Proposed interfaces, not implementation code.

## Application state port

`AuthStateReader` exposes `getState(): AuthViewState`, `getInitialState(): AuthViewState`, and `subscribe(listener: (state: AuthViewState, previous: AuthViewState) => void): () => void`. All functions have stable identity and may be passed unbound. No React, Zustand, native bridge or transport types cross this contract.

`AuthStateStore` extends the reader with `replace(next: AuthViewState): void` and `dispose(): void`. `replace` accepts a complete immutable snapshot and removes obsolete optional fields by full replacement. Writes are synchronous; listeners see the accepted current snapshot. Replacing with the identical root reference is a no-op. Unsubscribe and dispose are idempotent. Closed stores accept no writes and retain no active subscribers.

The controller receives the writer interface, gateway interface and clock interface. `AUTH_STATE_STORE` is the canonical runtime token beside existing auth tokens; `createAuthRuntime` is the composition factory that binds the concrete adapter. No adapter import/default construction belongs in application code. Controller getSnapshot/subscribe may remain as compatibility reads delegating to the port; they do not own another state copy.

## Zustand adapter

The adapter calls `createStore` from `zustand/vanilla` for each factory invocation. It wraps `setState(next, true)` to implement replacement, plus a closed flag and owned unsubscribe handles. No persistence/devtools middleware. Never expose the concrete writer to a screen. No event forwarding into a second mirror store.

## Runtime and dependency injection

`AuthRuntime` exposes readonly controller and `AuthStateReader` properties plus idempotent `dispose`. Factory construction allocates a fresh state store, injects it into the controller with the native gateway and clock, and returns a read-only reader facade. If construction fails, clean up resources already acquired. Avoid native subscriptions/commands during React render; `start` remains in the provider effect.

AuthProvider owns an activation effect keyed by its stable runtime factory. The provider does not allocate a runtime or invoke the factory during render. Until an active runtime is published into Context, it renders the existing session-checking feedback using shared primitives; authenticated children are not mounted. This is initialization feedback, not a new domain session state.

Each effect setup creates a fresh activation record, invokes the runtime factory, registers a one-shot reader subscription and starts its controller. The controller's first state publication binds that runtime as the active Context value and removes the readiness subscription; subsequent snapshots go directly to selected consumers. Register AppState forwarding for this activation only. If setup throws, release resources already acquired and rethrow the synchronous failure so the existing error boundary offers Reload. Promise failures remain handled by the controller's safe error path.

Cleanup first invalidates that activation, removes its AppState forwarding, then disposes controller/gateway operations before closing the state adapter. Cleanup never resets a store or clears native credentials. Disposed instances are terminal. Context consumers may use only the current active activation; a stale inactive binding renders session-checking feedback instead of mounting children. Cleanup does not enqueue a replacement runtime.

On development effect setup → cleanup → setup replay, the second setup constructs and binds a new runtime/store/controller. It never starts the disposed first instance. Each activation owns its cleanup closure; stale cleanup cannot dispose the replacement. On real unmount no replacement is constructed. On recovery Reload the provider remount follows the same fresh setup path. There is one active state authority at a time per root; sequential development activations are separate lifetimes. Abandoned renders allocate no runtime and start no native work.

The ownership tests must verify zero factory/native calls from abandoned render, distinct instances during replay, one active gateway/AppState subscription, old callbacks rejected, construction-failure cleanup, and normal session resolution after the second setup. These tests precede the first runtime/provider implementation in T014 → T015. Framework-owned Context is the binding boundary, not a service locator inside application code.

`App` may expose an optional `createRuntime` interface-typed factory for tests, replacing the internal createController-only seam. Test fixtures create fresh stores through the same runtime composition; fault injection wraps the reader getState method to preserve render-failure coverage.

## React subscription contract

`useAuthSelector<T>(selector: (state: AuthViewState) => T): T` calls Zustand `useStore` with the read-only structural reader. Selector outputs obey Object.is; unchanged selected values must not trigger store-driven rerenders. Keep selectors pure and stable; avoid freshly allocated aggregate outputs. Use separate primitive/reference selections or `useShallow` only when an aggregate is needed. No custom equality package dependency is planned.

`useAuthController()` remains command-only. RootNavigator selects session status and safe error; Home selects pending and safe error. Login's current bindings can retain a whole-snapshot hook implemented as an identity selector because all state is used there. UI cannot invoke replace or author session state.

## Compatibility and external interfaces

Existing user-visible auth methods, routes, errors, form clearing, verification, background deadlines and native bridge commands remain unchanged. No HTTP endpoints or new native module contracts. No persistence/hydration lifecycle. Losing a local store lifetime preserves secure native session storage and requires fresh validation before protected UI.
