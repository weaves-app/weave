# Weave ClerkKit source dependency

Upstream: https://github.com/clerk/clerk-ios
Release: 1.6.0
Immutable revision: aff2e9019dcc0978d5955fe98bcde9ab935eecb1

Package.swift, Sources, Tests, LICENSE and README.md are copied from the exact upstream revision. Weave uses ClerkKit only; upstream package targets and dependency declarations are preserved. Transitive package resolution is committed with the app workspace.

The user approved the narrowly scoped logging remediation on 2026-10-08. The only upstream source edit is `Sources/ClerkKit/Logging/ClerkLogger.swift`, applying `specs/003-mobile-auth-recovery/contracts/clerk-ios-1.6.0-logging.patch`. It preserves public signatures and severity while removing provider messages/errors from sink and handler output. Upstream LICENSE remains in this directory. Revalidate the logging regression test and native builds whenever the revision changes.
