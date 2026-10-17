# Backend HTTP Contract

Two proposed endpoints under the existing `/api` prefix. These endpoints do not yet exist. Both accept only JSON, return `Cache-Control: no-store`, enforce a 4 KiB body limit and reject unknown fields. Native transport supplies `Authorization: Bearer <Clerk session token>` directly; credentials are redacted in request/error logs and tracing.

## Authentication and environment

Use the pinned Clerk backend adapter to authenticate session tokens only. Verify signature, expiry/not-before, configured instance issuer, nonempty subject/session ID and session completion. Require a current active Clerk session whose user matches the subject; reject revoked/ended/pending/task-incomplete sessions. Use trusted server configuration for key discovery; never fetch keys from caller-controlled URLs. If a token has `azp`, require the configured allowed origin; native tokens without `azp` are allowed only through this bearer-only contract, never cookie fallback. If an audience is configured for the environment, require it. Authentication/provider lookup outages yield unavailable, not a guessed authenticated account.

The current Clerk account ID is the OneSignal external ID; do not map it to the unrelated initial Prisma User UUID. No client `accountId`, `externalId`, `appId`, provider URL or previous-account query is accepted. Backend Clerk and native Clerk must point to the same environment. A native response can be used only if its captured session/generation is still current.

## POST /api/notifications/identity-grant

Input: empty object. Response 200: `{ externalId, token, expiresAt }`, consumed exclusively in native code. `expiresAt` is an ISO timestamp; signed expiry is at most 300 seconds and no later than the authenticated token expiry. Immediately before signing, compute remainingSeconds = authenticatedTokenExp - floor(serverNowMs / 1000). Require remainingSeconds >= 15; 14 or fewer yields 503 notifications_unavailable with retryAfterSeconds=5 and Retry-After: 5. Set JWT exp = min(authenticatedTokenExp, floor(serverNowMs / 1000) + 300). The native client does not immediately refresh/reissue after this response; the next explicit Retry or distinct activation obtains a current token through the existing SDK. It never starts a login flow. Credentials already expired at authentication remain 401, distinct from a credential with insufficient remaining signing time.

The signer uses `jose` ES256 and the configured OneSignal key. Include only the required app/identity/expiry claims described in research; exclude email, phone and business attributes. Do not return any private signing or API key. Apply the shared account grant budget before signing. No caller-directed claim injection or alternate algorithm is permitted.

## POST /api/notifications/readiness

Input: `{ subscriptionId, platform }`. Subscription ID must be a canonical UUID; platform is `android` or `ios`. Native obtains the ID from its own SDK registration. The API does not treat knowledge of that ID as proof: only a matching entry in the authenticated account's provider record can confirm readiness.

200: `{ status: 'ready' | 'pending', checkedAt, validForSeconds }`. `validForSeconds` is 60 only for ready and 0 for pending. Never return another account's existence, provider profile, push token, external ID, raw errors or the complete subscription list. The native caller retains request context; the response is not a portable authorization credential.

Use the fixed app-scoped View User endpoint and a server-minted identity JWT for this same authenticated account. A fresh response must match `identity.external_id`; locate the exact subscription ID, expected `AndroidPush`/`iOSPush` type, `enabled === true` and a nonempty token. Validate `app_id` if present; the fixed request endpoint establishes app scope when it is absent. Treat the provider’s enabled flag as delivery eligibility, together with the exact identity/type/token match and current native permission; do not interpret undocumented optional numeric status codes as a universal cross-platform enum. Do not accept partial/incorrect types through coercion. Validate the entire needed response shape and cap provider response size at 1 MiB.

404/missing subscription/disabled subscription/mismatched fields return pending without disclosing why another account might own it. Malformed successful provider responses and provider authentication/configuration failures return unavailable. Acquire the global budget immediately before the external read. Requests waiting for the budget return bounded retry guidance rather than occupying a worker queue. No completed positive cache, batch list of arbitrary users or automatic subscription transfer endpoint.

## Failure responses

| HTTP | Public code               | Behavior                                                                           |
| ---- | ------------------------- | ---------------------------------------------------------------------------------- |
| 400  | invalid_request           | Safe invalid-input result; no provider call                                        |
| 401  | authentication_required   | Clear readiness; no push-created auth reset or sign-out                            |
| 413  | request_too_large         | Reject before use case                                                             |
| 429  | retry_later               | `retryAfterSeconds` and matching Retry-After, clamped 1–60 seconds; remain pending |
| 503  | notifications_unavailable | Safe unavailable state; optional bounded retry guidance                            |

Wrong-account installation input yields the same pending result as an unknown installation. For provider 429, honor its cooldown in the shared budget; if longer than the public cap, repeated attempts still remain pending until the full server cooldown elapses. Never retry provider 400/401/403 automatically. Network timeout is 5 seconds; failures release in-flight coalescing entries and do not return a previous success.

## Logout and operational verification

No authenticated call is required to finish local sign-out. The native SDK suspends/removes delivery eligibility and reconciles later. Operator-controlled provider reads and targeted non-sensitive sends prove cleanup in acceptance; do not introduce an unauthenticated prior-account lookup or retain credentials to keep querying after logout. If future product scope needs a user-visible server-confirmed logout receipt, it needs a separate restricted cleanup-capability design.

## Required contract tests

Real HTTP wiring with valid/invalid bearer tokens; wrong issuer/subject/session, expired/revoked/incomplete session; strict input limits; account parameter rejection; unknown subscription indistinguishability; all provider field/type mismatches; current grant signing/expiry including 14/15/16-second boundaries and time advancing during session validation; key/token redaction; JWT-gated provider authorization; 429/timeout/malformed response; no stale positive reuse; distributed budget contention and recovery against PostgreSQL. Exercise the compiled API runtime with the ESM signing dependency, not just tsx/typechecking.
