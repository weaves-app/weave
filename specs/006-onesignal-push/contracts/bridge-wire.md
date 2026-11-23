# Notification bridge wire contract — version 1

Implementation detail of the approved native boundary. `execute(command, payload)` accepts JSON objects only. Every request contains `version: 1`, a nonempty `rootLease` (at most 128 characters), and a nonnegative safe-integer `generation`. The command is exactly one of acquire/release/reconcile/enable/refresh/openSettings. Unknown commands, extra keys, invalid types and partial identity pairs fail closed. No URL, token, provider ID or payload navigation instruction is accepted.

- acquire/release: lease only, generation 0. Acquire installs the new root lease; release affects only the matching current lease. Neither confers authentication.
- reconcile: sessionId and accountId are either both nonempty strings or both absent (signed out). Generation is present even for signed-out intents. Retain the highest generation for the lease; reject older intents and same-generation identity changes. Repeating the same intent can refresh silently.
- enable/openSettings: require the current bound sessionId/accountId and generation. Only enable may prompt/opt in; settings only opens the system notification settings.
- refresh: requires current bound identity, current nonnegative safe-integer installation `revision`, and `attemptId` as a canonical positive JavaScript-safe-integer decimal string (for example `"1"`, `"2"`; no leading zero, sign, decimal point or exponent). This performs server verification, not a permission request.

All signed-in commands additionally require the native validated auth authority. Notification generation is **not** the auth authority's own epoch; native transport captures both independently, checking actual current session/task completion and authority epoch around async work. A JS ID never authorizes a different native session.

Responses/events are JSON objects with exactly the fields of one envelope:

- Observation: `version:1`, `kind:'observation'`, rootLease, generation, revision, permission, canRequest, registrationPresent, enabled, matchesCurrentAccount. Permission uses the domain vocabulary. No account, subscription ID or token is returned.
- Readiness: `version:1`, `kind:'readiness'`, rootLease, generation, revision, attemptId, status, remainingValidityMs; optional retryAfterSeconds. Status is ready/pending/unavailable/unauthorized/rate-limited. Remaining duration is an integer in 0–60000; only ready permits a positive value. Retry guidance is a finite integer in 1–60. Native absolute monotonic timestamps never cross the bridge.
- Error: `version:1`, `kind:'error'`, rootLease, generation, `code` (invalid-request/stale/unavailable). No message, exception, request body or provider details.

`onNotificationChanged` emits observation envelopes only. Readiness is returned to the correlated execute call; raw SDK notification/click payloads are never emitted. Ignore events for stale leases/generations/revisions. A malformed response becomes sanitized unavailable state. Duplicate completed readiness cannot renew a proof. The JS controller increments the attempt sequence per root. Both gateway and native coordinator retain the highest accepted sequence for the lease, reject any sequence at or below it, and reset only when acquiring a different lease (never on a generation change or repeated acquisition of the same lease). Validate current lease/generation/revision before advancing the high-water mark. This bounds replay bookkeeping without limiting the number of distinct attempts or evicting old replay protection.

The adapter strips no secret fields into an otherwise trusted result: unknown fields invalidate the entire envelope. Native parsing enforces a bounded payload before decoding (4 KiB); all counters are within JavaScript safe integer range. Release failures remain local and cannot reset authentication.
