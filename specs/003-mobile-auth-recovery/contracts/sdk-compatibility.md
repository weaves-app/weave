# T003 SDK compatibility finding and remediation proposal

The selected SDK source revisions are ClerkKit 1.6.0 (`aff2e9019dcc0978d5955fe98bcde9ab935eecb1`) and Android 1.1.11 (`5d1895dc401a76dd3244eac925ebf87409561a47`).

## Verified logging incompatibility

ClerkKit's `ClerkLogger.performLog` builds raw error/LocalizedError descriptions into its log string and unconditionally calls the sink for errors. `Clerk.Options.logLevel = .error` does not suppress them; loggerHandler is called after the sink and is not a replacement. A probe compiled the pinned logger unchanged with only a minimal Clerk.Options/installed-config harness. With a synthetic LocalizedError, its captured sink contained the seeded sensitive marker. No real credential was used.

Android's internal ClerkLog writes provider-supplied messages to Android Log for e/w/i and falls back to println. Debug mode false suppresses only d/v. Its configuration does not expose replacement of these error/warning/info sinks. Android behavior has been inspected in source; no Android runtime test result is claimed.

This conflicts with FR-012 and the approved authentication contract's prohibition of raw provider errors in diagnostics. Application-only sanitization cannot intercept these SDK-owned sinks.

## Concrete proposal

Maintain the attached narrow patches against the exact selected SDK revisions. The iOS patch emits only SDK/severity text and sanitizes logger-handler payloads. The Android patch suppresses SDK diagnostics while preserving method signatures/return types. Keep Weave's own allowlisted operation/outcome diagnostics. Preserve upstream licenses and immutable revision provenance.

Adoption would require maintained source-based SDK dependencies, reproducible locked resolution/builds, native logging regression tests, and revalidation when SDK versions change. This adds SDK-patch ownership; it is a material change from unmodified published dependencies. No patch has been applied to an application dependency, Gradle artifact, Xcode package cache, or remote repository. The patches are review artifacts only.

Other path: revisit native SDK/version selection and verify an adequate logging-control API before adoption. Do not waive FR-012 or silently weaken logging guarantees.

## Other setup observations

The Android SDK release builds with Kotlin 2.4.20 while Weave uses 2.1.20; the exact consumer-compatible upgrade must be proven in a native compile before marking T003/T005 complete. Local system Ruby is 2.6; Homebrew Ruby 3.4.4 is available, but locked project gems are not installed. Installed Node 24.2.0 is below RN's Node24 minimum patch and npm is 11.7.0 versus repository npm11.19.0. These can be addressed locally without changing product behavior. No build compatibility claim is made.

## Renderer diagnostic refinement (2026-10-08)

Confirmed S12/FR-012 also applies to React Native's renderer diagnostic sinks. Local RN0.86.3 source routes caught, uncaught and recoverable errors through `getExtendedError`, which retains raw error/message/stack/componentStack. AppRegistry offers no public handler override. The parent implementation adds a maintained source transformation in `apps/mobile/scripts/renderer-privacy-patch.json` and `apply-renderer-privacy.mjs`, under the confirmed privacy requirement and implementation authorization. It preserves the exact upstream severity/fatality APIs and replaces diagnostic objects with generic errors without original or generated stacks. No private/global hook or authentication/session behavior changes.

The patch verifies package version and original/patched SHA-256, is idempotent, runs through mobile postinstall, and gates mobile tests through `test:privacy`. A pinned source upgrade or unexpected source fails instead of silently patching. The actual SDK handler probe compiled/ran before patching: expected RED1 for raw diagnostic payload; after patching: GREEN0 for all three severities with fatality preserved. Probe logs are `evidence/renderer-privacy-{red,green}.txt`. This is SDK capability evidence; React Test Renderer diagnostics in Jest are independent and excluded only in throwing fixtures. Physical-device captured log validation remains unrun.
