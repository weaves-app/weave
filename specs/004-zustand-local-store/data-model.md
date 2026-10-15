# Data Model: Mobile Local State

WEA-27 · 2026-10-15 · [Specification](spec.md)

## Entities and ownership

| Entity          | Fields                                                                               | Owner / relationship                                                                             |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Auth runtime    | controller, read-only state reader, idempotent dispose                               | One per active provider effect activation under the error boundary                               |
| AuthViewState   | session, attempt, pending, optional safe error                                       | Single Zustand snapshot per runtime; existing domain interface reused                            |
| SessionSnapshot | status, generation, revision, optional validatedAt, sessionId, accountId, safe error | Native gateway result projected by controller; not a credential or independent session authority |
| LoginAttempt    | method, stage, optional attemptId, codePurpose, retryAfterSeconds                    | Existing controller-managed ephemeral challenge progress                                         |
| SafeAuthError   | code, messageKey, optional retryAfterSeconds                                         | Allowlisted domain values; no raw provider errors or stack traces                                |
| Subscription    | listener, unsubscribe function, active lifecycle                                     | Adapter owns active subscription cleanup; each consumer owns its unsubscribe                     |

Reuse all existing exported finite vocabularies from auth-models.ts. No database entities, persistent migrations or new public network DTOs.

## Initial state

Every factory call returns fresh objects: session resolving, generation/revision zero; password method, idle attempt; pending false; error absent. `getInitialState()` is a stable reference to that lifetime's initial immutable snapshot. `getState()` is reference-stable until an accepted replacement. Never mutate nested values in place.

## Transitions

| Event                           | Result                                                                  | Decision owner                                               |
| ------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------ |
| Start/foreground refresh        | Resolving, then active/signedOut/unavailable                            | Existing controller/native gateway                           |
| Login/code/provider operation   | Pending/stage/error updates, challenge or session outcome               | Existing controller                                          |
| Duplicate request               | Existing pending/session guards reject duplicate operation              | Existing controller                                          |
| Method selection                | Abandon old attempt, fresh operation generation, signedOut/idle         | Existing controller                                          |
| Successful logout               | SignedOut and existing attempt/pending/error reset                      | Existing controller; native gateway clears session           |
| Failed logout/timeout           | Existing unavailable/recovery state, no optimistic successful logout    | Existing controller                                          |
| Stale generation/revision       | No accepted snapshot replacement                                        | Existing controller                                          |
| Runtime dispose                 | Stop controller/gateway callbacks, detach listeners; no further writes  | Runtime owns ordered cleanup; adapter enforces closed writes |
| Recovery Reload/process restart | A fresh runtime resolves native session; old attempt/error not restored | App root composition                                         |

Disposal does not mean logout and must not clear native secure credentials. No generic store reset action may independently assert signedOut or active. Reload uses a new instance rather than resetting and reusing the old instance.

## Invariants and validation

- Only controller-authored accepted complete snapshots replace current state. Full replacement removes absent optional fields such as an old error; shallow merge is not the contract.
- Gateway input validation, session revisions, operation generations, retry limits, timeout rules and protected-route decisions remain in their existing owners.
- Store contains no email form draft, password, verification code, token or raw provider object. Optional account/session/challenge identifiers are permitted ephemeral metadata only.
- One runtime cannot observe or modify another runtime's snapshot. No shared mutable initial object, global store, persistence or hydration.
- Adapter ignores writes after disposal, supports idempotent cleanup, and immediately unsubscribes any subscriber registered after disposal. It does not emulate a nonexistent Zustand destroy API.
- Selected values use Object.is identity equality. Select primitives or preserved nested references; aggregate selectors must return a stable reference or use a documented shallow helper.
- Immutable snapshots and retained references let unrelated selected values remain equal even when another field changes.

## Provider activation lifetime

An activation is private provider ownership metadata: active/inactive flag, owned runtime and AppState unsubscribe handle. It is not part of AuthViewState. Render allocates no runtime; effect setup creates one, with existing session-checking feedback until binding. Cleanup makes that activation inactive and terminally disposes its resources. Development replay creates a new activation; real unmount creates none. A root has at most one active authority, and old cleanup/callbacks cannot reach a replacement.
