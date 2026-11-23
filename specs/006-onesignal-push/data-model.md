# Data Model: WEA-29

All application contracts use readonly fields and validated values. Provider data and bridge JSON enter as unknown. These are design records, not source implementations.

## Notification context

A context captures `rootLease`, monotonically increasing `generation`, validated `sessionId`, `accountId` and current subscription identity. Session/account IDs are references supplied by the existing authentication authority; they do not confer authority by themselves. An inactive/unknown auth snapshot immediately removes readiness and requests native suspension. Re-entering the same account still creates a new generation; A → B → A must not accept an earlier A result.

## Permission observation

Fields: normalized `permission` (`undetermined`, `allowed`, `denied`, `restricted`, `unavailable`), `canRequest`, and observation revision. Map platform realities instead of inventing an Android runtime prompt on versions without one. Provisional/limited platform states do not count as full allowed permission for this foundation; offer an explicit upgrade action where supported. Settings changes invalidate readiness immediately on observation and are refreshed at foreground activation.

## Installation observation

Native-only sensitive fields: provider subscription ID and push token, provider external ID and native auth credentials. JS receives `registrationPresent`, `enabled`, `matchesCurrentAccount` and a monotonically changing installation revision, never the token or credentials. Subscription replacement increments the revision and invalidates all earlier checks. No application persistence duplicates SDK token storage.

## Readiness confirmation

Fields crossing to JS: `attemptId`, current context generation and installation revision, status, server `checkedAt` for diagnostics, and integer `remainingValidityMs` in 0–60000. Absolute native monotonic timestamps never cross the bridge. The native layer retains the exact subscription/account binding used by the request. A confirmation is valid only for that exact context, allowed permission and eligible local registration.

JavaScript creates a unique attemptId within the current root lease and records jsAttemptStart before dispatching the readiness operation. Native records nativeRequestStart immediately before its corresponding HTTP request and bounds its deadline by nativeRequestStart + 60000 ms, shortened by the server's validForSeconds. At event emission it computes remainingValidityMs using its own monotonic clock. JavaScript accepts only a known in-flight attempt and sets jsDeadline = min(jsAttemptStart + 60000 ms, jsNow + remainingValidityMs). Both sides reject zero/expired validity. This deliberately conservative bound includes native/bridge delays without comparing clock origins. Server checkedAt is diagnostic only; wall-clock changes cannot extend a proof. Duplicate events for a completed attempt cannot renew its deadline, and unsolicited ready events without a matching attempt are rejected. Background/root changes discard the attempt and proof.

Positive responses are not cached on the API. Client expiration does not trigger polling. Clock changes cannot extend validity: use a monotonic clock, and invalidate on background/foreground/root changes. A delayed response older than the validity interval is discarded. A fresh server read is necessary after any identity or installation change. A server observation is not a delivery SLA or remote queue cancellation guarantee.

## Visible state

| State             | Condition                                                       | Action                                            |
| ----------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| hidden            | No validated signed-in Home                                     | None                                              |
| permission-needed | Undetermined permission                                         | Enable notifications                              |
| disabled          | Denied/restricted/device disabled                               | Enable if prompt allowed; otherwise Open settings |
| pending           | Allowed but missing registration, binding or fresh confirmation | Retry when no request/cooldown is active          |
| ready             | Exact current context has valid server confirmation             | Status only                                       |
| unavailable       | Configuration, authentication-to-notifications or service fault | Retry if recoverable; safe copy otherwise         |

State updates do not reset auth or form state. An in-flight flag/cooldown disables duplicate actions. Permission decisions survive root reconstruction only through the platform; ready never survives a new root by local persistence.

## Native account intent

The process coordinator owns one desired account or signed-out state, one observer set and serialized app-issued commands. Each command carries a generation; before and after token retrieval, HTTP and SDK commands, check current intent. A late result never changes current UI or dispatches an obsolete follow-up. Already dispatched SDK work can outlive a generation; observe/reconcile toward the current intent. Persist a minimal cleanup-needed marker if necessary, never the old account's credentials; on next process startup reconcile signed-out suppression before any new account binding.

Logout invalidates UI immediately and requests native suspension/logout without awaiting network. Disabled historical provider records are permitted. Remote cleanup acknowledgement is validated by controlled operator checks, not by a fabricated promise returned from a void SDK method. No post-logout endpoint accepts a caller-supplied previous account.

## Server request budget

New `NotificationRequestBudget` record: `key` (primary key), non-null `nextAllowedAt`, nullable `expiresAt`. Global provider/cleanup rows use a server-generated app scope and expiresAt=null; account rows use an HMAC account scope and require non-null expiresAt. Account quotas span sessions, so creating another session cannot reset the account limit. Keys contain no raw account ID, token or provider profile. Secret material is configuration, not table data.

Use atomic conditional PostgreSQL insert/update with database time; only the successful claimant may call the provider. Global View budget reserves at least 1 second between starts, including across API replicas. Fail closed when budget storage is unavailable. Reserve a bounded cooldown on provider 429/Retry-After; permit no burst when a process resumes. Authenticated endpoint limit: at most one identity grant per account per 5 seconds and one verification attempt per account per second. Same-process identical requests may share one in-flight promise, never a completed positive cache.

On each successful account reservation, set expiresAt = nextAllowedAt + 24 hours using database time; extend it if a later cooldown extends nextAllowedAt. Rejected attempts do not extend retention. Global rows never expire. Add an expiry index and ensure account rows cannot expire before their cooldown ends.

Cleanup deletes at most 100 expired account rows per transaction, ordered by expiresAt/key, only when both expiresAt and nextAllowedAt are at or before database time. Lock/recheck selected rows so a concurrent reservation cannot lose its cooldown. Opportunistic cleanup runs at most once per 60 seconds per app across replicas, using a global cleanup-budget row. It never runs on unauthenticated traffic and does not loop to drain the table during a user request. Cleanup failure is recorded safely and does not reverse a successful reservation; reservation/storage failure itself still fails closed.

A manual `pnpm --filter @weave/api run notifications:cleanup` maintenance command uses the same one-batch/100-row operation and distributed cleanup budget, reports only aggregate counts, and exits without a daemon or scheduler. If there is no traffic, rows may remain beyond expiry until this command or the next permitted sweep; no hard deletion-time SLA is claimed. No durable queue, push payloads, user/profile duplication or installation ownership table is introduced.

## Secret configuration

Backend: Clerk secret/public verification configuration and expected issuer; fixed OneSignal app ID; ES256 signing private key; HMAC budget key; database connection. Native: public OneSignal app ID and fixed HTTPS API origin only. FCM/APNs private credentials stay with the provider's platform configuration. Signed binding JWTs have a maximum five-minute life and never outlive the authenticated session token used to mint them. Immediately before signing, require at least 15 whole seconds of remaining authenticated-token validity; less than 15 yields unavailable, including expired credentials that first pass through the authentication boundary only to expire during subsequent work. No notification sender API key is needed by this design.
