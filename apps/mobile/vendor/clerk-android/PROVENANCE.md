# Clerk Android API source dependency

Upstream: https://github.com/clerk/clerk-android
Release: clerk-android-api 1.1.11
Immutable revision: `5d1895dc401a76dd3244eac925ebf87409561a47`
License: MIT (retained in LICENSE).

`source/api/src/main` and consumer rules are copied from this revision. `gradle/upstream.versions.toml` records the upstream dependency catalogue. Weave's minimal consumer Gradle build uses these exact dependencies and excludes publishing, documentation, sample, UI and telemetry projects and upstream test fixtures. No hosted Clerk API artifact replaces this source project.

Maintained privacy change (approved 2026-10-08): ClerkLog sink suppression from `specs/003-mobile-auth-recovery/contracts/clerk-android-1.1.11-logging.patch`. Preserve upstream public object visibility and all five Int-returning methods. Android raw provider diagnostics must never reach Log or stdout. Regression tests exercise all severities with seeded synthetic secrets.

Weave-owned integration addition: `source/api/src/main/kotlin/com/clerk/api/sso/WeaveAuthenticationBridge.kt` exposes only the existing internal pending-SSO cancellation capability. This reversible bridge was adopted during implementation on2026-10-08 to satisfy confirmed S08/S17 abandonment/retry while preserving cached sessions and storage. It does not call Clerk.reset or change provider policies. The SDK's pending-flow/callback matching remains unchanged. A capability regression in `src/test/kotlin/com/clerk/api/sso/WeaveAuthenticationBridgeTest.kt` verifies completion, capability clearance, cached-session retention and zero secure-store interaction.
