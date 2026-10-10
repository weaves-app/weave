# Mobile authentication contract

Scope: WEA-10 mobile slice, FR-001–FR-015. This is an application port and UI contract, not a new HTTP API or a shared web/native SDK wrapper.

## Application port

Use interfaces for object contracts with readonly inputs and explicit results. Publish the consumer-owned `AuthenticationGateway` contract from the mobile authentication module; a single canonical `AUTHENTICATION_GATEWAY` token and typed factory/Context bind it at the composition root. Native objects and Clerk types stay inside infrastructure.

| Operation             | Inputs                                      | Observable result                                                                               |
| --------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Resolve session       | Current generation; force fresh validation  | Active, signedOut, or unavailable snapshot; never trust cached identity alone                   |
| Subscribe             | Snapshot observer                           | Unsubscribe function; ordered invalidation/session updates                                      |
| Sign in with password | Email, password, operation ID, generation   | Completed session or code challenge or safe error                                               |
| Request email code    | Email, operation ID, generation             | Opaque attempt handle and awaitingCode or safe error                                            |
| Verify email code     | Attempt handle, code, purpose, generation   | Completed session or safe error; incomplete flow does not unlock Home                           |
| Resend email code     | Current attempt handle and generation       | Updated challenge/rate-limit hint or safe error                                                 |
| Sign in with Google   | Operation ID and generation                 | Completed existing-account session, cancellation, or safe error; signup transfer forbidden      |
| Sign out              | Active session ID, operation ID, generation | Actual local/provider session outcome, including partial failure                                |
| Abandon operation     | Operation ID/generation                     | Late completions cannot activate application access; release listeners/UI pending state         |
| Dispose               | None                                        | No callbacks into a disposed controller; native credential state is not wiped merely by remount |

Native boundary uses a typed TurboModule schema for codegen and runtime validation of returned data. Promise rejection values are `unknown` at the TypeScript boundary and narrowed into safe errors. Credentials are transient arguments, never emitted in snapshots/events. Invalid module responses become unavailable, not active. An adapter activation epoch must prevent late native side effects from leaving an unexpected session persisted; merely ignoring a JavaScript result is insufficient. Reconcile/end an obsolete newly created session before publishing a signedOut result.

## Timeouts, cancellation, and lifecycle

Design default: 30-second deadline for network/password/code/session-resolution/logout operations. Google external UI gets a 120-second foreground active-wait deadline, paused while the OS backgrounds the app; cancellation returns Login immediately. Inject a `Clock`/scheduler for deterministic deadline/rate-limit tests. Deadline expiry invalidates the operation epoch; remote effects may still happen and must be reconciled before access can resume. Return from background triggers fresh session validation before protected interaction resumes.

## Route contract

`RootStackParamList` contains exactly `Login` and `Home`, with no parameters. Resolving/unavailable/recovery UI is rendered outside application routes. A native-stack conditionally registers Login for signedOut and Home for active. No manual navigate after session transitions and no persisted navigation state. Signed-out Home requests, unknown URLs, and stale history cannot register Home. OAuth callback handling is separate from page navigation and requires a current matching SDK-owned pending flow; a URI alone never authenticates.

## UI contract

Login: email/password fields with Login; email-code mode with Send code, verification input, Verify, Resend and a return-to-method-selection action; Continue with Google. All belong to one Login route. Password-triggered email device verification uses the same code controls with an explicit challenge purpose (S19); unsupported MFA/account/session requirements show blocked-login feedback and usable method selection without policy bypass (S20). Changing method abandons the previous attempt and clears secret fields. Busy state disables conflicting actions. App-provided copy reports invalid/expired/rate-limited inputs and existing-account requirements. Home: only Logout as an interactive action, including pending/error feedback; no new dashboard or profile widgets.

Reuse Button, Typography, Screen and semantic tokens. Add focused native Input/FormField/Feedback primitives only as required, and document states in the component catalogue. Ensure screen-reader announcements, focus on validation/recovery feedback, text scaling, keyboard reachability, safe areas and touch targets. Fallback must not depend on authentication, navigation, or an outer safe-area Context that might have failed.

## Recovery contract

Boundary wraps authentication bootstrap/provider, controller, navigation, and screens. A minimal native fallback shows a friendly message and Reload. A guarded Reload handler increments root generation, resets the boundary and subtree, then calls fresh session resolution. Development-only runtime reload APIs are not the production solution. Boundaries contain descendant render/lifecycle errors; operation rejections use explicit feedback. Native crashes, pre-mount failures, errors in the fallback itself, and arbitrary asynchronous/event-handler exceptions are outside this boundary's guarantee.

## Privacy and observability

Allowlisted diagnostics only: operation kind, outcome code, platform, generation and coarse elapsed time. No passwords, codes, email addresses, full callback URLs, credential headers/bodies, session tokens, user objects or raw errors/stacks. Verify SDK logging configuration as well as application logging. Production output excludes raw stacks even when tests inject them. No external telemetry service is added.
