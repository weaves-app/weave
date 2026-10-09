# WEA-10 mobile authentication data model

No application database tables, migrations, signup entities, or account-management APIs are introduced. Clerk owns accounts and sessions. These models describe the mobile application contract, independent of SDK types.

## Account reference

- `accountId`: opaque provider ID, used only after authentication; no local profile replica.
- An existing account can support password, email-code, and/or linked Google credentials. A method is available to the account only when enabled by its authentication configuration.
- Identity uniqueness and provider-account linking remain Clerk responsibilities. The app does not look up accounts through a privileged backend endpoint or link identities itself.

## Session snapshot

- `status`: `resolving`, `signedOut`, `active`, or `unavailable`.
- `sessionId`, `accountId`: opaque IDs present only in an active snapshot; never equivalent to session credentials.
- `generation`: monotonically increasing application epoch to discard late responses.
- `revision`: increasing native adapter state sequence within an epoch, used to order callbacks.
- `validatedAt`: time of successful fresh session validation, for lifecycle decisions; not a client-created authorization proof.
- Invariant: active requires a completed authentication flow, an active provider session, no pending provider session tasks, and successful session validation. A cached user object alone is insufficient.
- Unknown, unavailable, incomplete verification, and unrecognized provider states never unlock Home.

Transitions: startup/reload/foreground validation → resolving → active or signedOut; service/secure-storage failure → unavailable → retry → resolving. Known expiry/revocation → signedOut. Logout success → signedOut. Logout failure → reconcile actual provider/local state: active with retry feedback if still valid, signedOut if already cleared, unavailable if validity cannot be determined.

## Login attempt

- `method`: `password`, `emailCode`, or `google`.
- `stage`: idle, submitting, awaitingCode, verifying, awaitingProvider, or failed.
- `attemptId`: opaque adapter handle for the current native attempt; invalidated by method switch, reload, logout, and a newer attempt.
- `email`: form input held only while needed; trim surrounding whitespace and delegate authoritative identity validation to the provider.
- Password and code: transient secrets held only for submission, cleared on completion/cancel/reset; never persisted or logged. Do not trim passwords.
- `retryAfterSeconds`: optional provider-supplied rate-limit hint; no made-up OTP lifetime or resend entitlement.
- `codePurpose`: sign-in or provider-required email device-trust challenge. Supporting existing email-code verification does not enroll MFA.
- Only one pending operation across login methods; use operation ID plus generation to prevent duplicate and stale activation.
- Unknown identity → sanitized existing-account-required error. Do not transfer to signup or create a user.
- Unsupported required MFA/session tasks → clear blocked-login feedback and no Home; a future scope change is required to implement new challenge types.

## Safe error

- `code`: invalidInput, rejectedCredentials, codeInvalid, codeExpired, rateLimited, existingAccountRequired, cancelled, network, timeout, configuration, verificationRequired, storage, or unexpected.
- `messageKey`: app-owned user-facing copy; raw native/provider messages are not automatically safe.
- Optional `retryAfterSeconds` and affected field identifier; no request payload, token, email, stack trace, or provider object.
- Cancellation returns idle Login without crash wording. Expected promise failures never depend on a render boundary.

## Recovery generation

- `rootGeneration`: increments once per explicit Reload activation.
- `hasError`: UI-only flag within the current boundary.
- Reload disposes subscriptions/controllers, abandons pending attempt state, clears fields/history, creates a fresh UI/controller tree, and explicitly validates the session. Secure session persistence survives only if valid.
- Repeated failure returns the fallback; no automatic retry loop.

## Configuration and persistence

Environment chooses the shared web/mobile Clerk identity application via publishable key and native callback configuration. No secret key reaches JavaScript or native resources. Secure device/session credentials stay in platform-backed storage owned by the selected adapter; no AsyncStorage token cache. UI models, routes, passwords, codes, and provider error objects are not persisted. Storage failures fail closed and are testable through the adapter seam.
