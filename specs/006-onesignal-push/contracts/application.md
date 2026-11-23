# Application Contracts

## Mobile public boundary

`NotificationController` exposes start, refresh, enable, openSettings, setForeground and dispose. Auth-context updates are supplied by the composition root using the published auth state reader. It never calls login/logout/refresh on the authentication controller. `NotificationStateReader` exposes immutable getState/getInitialState/subscribe; UI selects small slices through the existing vanilla-store adapter pattern.

Consumer-owned interfaces: `NotificationPlatform` (acquire lease, observe, reconcile identity, explicit permission request, settings, check readiness, release), `NotificationStateWriter`, `MonotonicClock`. Dependencies are injected; domain/application imports no SDK, React, Zustand or native module. Native bridge parsing is confined to infrastructure. Public exports hide concrete adapters.

The composition root subscribes to validated auth snapshots and existing AppState handling, owns disposal and passes a notification reader/controller to Home. Do not import private auth contexts from another feature. If a new public runtime accessor is necessary, document and test it as an auth contract extension without changing session behavior.

## Native bridge

Exact implementation envelopes are recorded in [bridge-wire.md](bridge-wire.md).

`NativeWeaveNotifications` is an authored New Architecture TurboModule with versioned request/result envelopes and sanitized observation events. Operations are an allowlist: acquire, release, reconcile, enable, refresh, openSettings. Reject unknown operations, malformed payloads and stale leases at the boundary. Requests carry root lease and generation, including signed-out reconcile intents; each root maintains a strictly increasing intent generation so delayed signed-in requests cannot overtake logout. The TypeScript platform port receives generation even when context is null; readiness requests additionally carry attemptId. Events carry lease, generation and installation revision; readiness results echo attemptId and integer remainingValidityMs in 0–60000. Never serialize an absolute native monotonic deadline. Apply the two-clock calculation in data-model.md; ignore unknown/completed attempts and never extend an existing proof from duplicate events. No raw provider payload, push token, Clerk token or OneSignal JWT crosses this module.

One process coordinator initializes OneSignal once. It owns listeners independent of React mounting and holds only one active root lease; replacement invalidates the earlier lease. Disposing a stale root cannot tear down a newer root. Auth-session changes can invalidate native work even while JS is suspended. Fast Refresh/Reload must not duplicate initialization, observer registration or permission requests.

Auth publishes a native `SessionAuthorizedTransport` interface implemented inside its infrastructure: perform one allowlisted notification HTTP operation for a captured validated session. Its origin/path cannot be supplied by JS. Reject redirects; require HTTPS, at most 16 KiB of decoded response-body bytes and a 5-second HTTP timeout. Enforce the byte cap while reading, before JSON parsing, for success and error responses; oversized bodies become sanitized unavailable results. Token acquisition also has a 5-second timeout, with late completion rejected by the captured context. Token acquisition and response acceptance re-check current active, task-free session/account. Notification-specific failures return sanitized results without altering session authority. No token-returning JS method is added.

The native coordinator handles signed account login and credential invalidation events. It requests a new grant only for its current desired validated session, respects grant cooldown and ignores old-account invalidation events. A setup attempt acquires one current Clerk token through the existing SDK and sends at most one identity-grant request. A grant rejected for short validity returns unavailable with bounded retry guidance; it does not trigger a token-refresh/reissue loop. The next explicit Retry or distinct activation can acquire a current token again. Coalesce duplicate JWT-invalidation callbacks and do not replay them after a failed attempt; retain pending state until an allowed recovery trigger. No unsigned login fallback. Account switches suppress old eligibility first; sign-out remains immediately usable even if the SDK queues cleanup offline. Successful SDK method return is never labelled remote acknowledgement.

## Request/lifecycle rules

- Launch, sign-in, activation and Retry may reconcile/check; none may invoke permission prompts. Only Enable may request permission or perform an opt-in that could prompt.
- Coalesce same-context attempts. Different context invalidates old work; no parallel writes to the installation identity. A provider observer may complete an in-flight attempt when registration arrives, but cannot create an unbounded new attempt/retry loop.
- One foreground transition is one activation, regardless of repeated duplicate AppState events. Debounce by actual state transition, not an arbitrary timer. Enable double-taps produce one request.
- Readiness expires after 60 seconds at most. Account/root/registration/permission/background changes invalidate it earlier. Expiry merely updates state; Retry/next activation initiates the next check.
- Grant/readiness failures are typed unavailable/pending/unauthorized/rate-limited outcomes. Retry guidance is bounded and disables rapid repeated requests; do not schedule hidden retries. SDK-internal retries remain distinct from app-owned attempts.
- Notification receipt leaves existing session, forms and navigation untouched. Platform default foreground display is used once; no manual `display()` plus automatic display combination.
- Taps have no authored routing side effect. Native URL suppression ensures the ordinary app activity/session gate opens. Never retain or replay payload instructions after authentication.

## Backend application ports

`SessionAuthenticator` produces a verified account/session/token-expiry context or a typed failure. `IdentityGrantSigner`, `ProviderReadinessReader`, `RequestBudget`, and `Clock` are consumer-owned interfaces; runtime symbols and factory providers live in composition modules. The readiness use case validates only the authenticated account. No SDK/HTTP/Prisma object enters application contracts. Runtime HTTP DTO validation precedes use-case calls, and provider decoding fails closed.
