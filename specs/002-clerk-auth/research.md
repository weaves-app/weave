# WEA-10 web research — 2026-10-06

Decision: exact `@clerk/nextjs@7.9.11`, verified npm peers accept Next ^16.0.10 and React ~19.2.3. Use current Core 3 API, not legacy examples. Alternative: prebuilt auth views; rejected for inability to prove fail-closed invitation edges and late-result cancellation in authored behavior.

Decision: custom password registration, send/verify email codes, finalize only completed verified signup. Signin supports password and Device Trust email code. Invitation uses ticket strategy with password and no email argument, so the provider owns recipient identity. CAPTCHA element stays present. Provider configuration must require email/password and email-code verification; owner controls settings.
Sources: [email/password](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password), [application invitations](https://clerk.com/docs/guides/development/custom-flows/authentication/application-invitations), [SDK upgrade](https://clerk.com/docs/guides/development/upgrading/upgrade-guides/core-3).

Decision: invitation redirect URL `/invite`. Reject absent, empty, whitespace, duplicate or oversized ticket values locally. Reject signed-in invitation entry before any provider mutation. Never substitute ordinary signup on provider rejection. Clerk normally sends expired links to normal signup, so actual configured redirect behavior is a live verification prerequisite.
Source: [inviting users](https://clerk.com/docs/guides/users/inviting).

Decision: Next 16 named `proxy` export wraps clerkMiddleware with runtime public-key callback. Direct server page and handler protection; no deprecated createRouteMatcher. Server session gateway reads auth and verified primary email, catches provider failures and denies access. No globally cached user data.
Source: [protect content](https://clerk.com/docs/guides/secure/protect-content).

Decision: server layout awaits connection(), reads CLERK_PUBLISHABLE_KEY, passes public key only to dynamic ClerkProvider; CLERK_SECRET_KEY remains server-only. Missing config shows recoverable unavailable UI and denies protected resource. Build works without keys; no keyless Clerk account provisioning. Runtime keys support promotion of one immutable image.
Sources: [Next env](https://nextjs.org/docs/app/guides/environment-variables), [Clerk middleware](https://clerk.com/docs/reference/nextjs/clerk-middleware).

Decision: deterministic gateway and DOM tests prove authored behavior; authorized owner-supplied instance/accounts/invitations are needed for real provider, reload/browser and cross-platform identity verification. No credentials or accounts are generated. No SDK compatibility unknown remains; live prerequisites remain delivery checks, not an assumption of success.

## Revision research — 2026-10-07

Decision: keep custom branded UI as explicitly approved by the user. Active web invitations are deferred. Use installed Core 3 `signUp.sso` / `signIn.sso` with `strategy: oauth_google`, `redirectUrl: /`, and `redirectCallbackUrl: /sso-callback`. Installed declarations confirm these signatures. Next.js 7.9.11 root types omit HandleSSOCallback; explicitly pin the existing transitive `@clerk/react@6.17.6` and import its public callback component, reusing ClerkProvider’s context. No private import or type suppression. Protected Home still independently requires a valid verified primary-email session.

Sources: [Clerk custom OAuth](https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections), [Google development/production setup](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google), installed @clerk/shared SSO type declarations and @clerk/react public callback declarations/implementation. Development Google uses Clerk shared credentials; production owner supplies custom Google credentials. Google live auth must be tested in a system browser.

Branding: owner-supplied kit Figtree/SIL OFL and vector logo/favicon; owner-approved generated bag render. Keep font licence with public brand assets. Semantic authTokens are a separate export so native token values/rendering remain untouched. Local next/font/local prevents remote font requests.

Live-debug revision: `HandleSSOCallback` had no terminal output for unresolved/default attempts and did not surface returned finalize errors to the authored view. The actual session was pending `choose-organization`; default useAuth treats pending as signed out, and reattempt returned `session_exists`. Current code uses public create/transfer/finalize/setActive APIs in a typed callback adapter, explicit pending-task handling and readiness gating. No internal SDK API or dashboard-security change is used. Official organization settings: https://clerk.com/docs/guides/organizations/configure . Previous callback-component decision above is historical.

## Organization API research — 2026-10-07

Installed declarations: ClerkPaginationParams uses initialPage/pageSize; user lists return data/total_count. UserOrganizationInvitationResource exposes publicOrganizationData and accept(). Clerk.createOrganization uses name, and setActive accepts organization plus navigate(session,decorateUrl). Pending identity reads are explicit; protected data continues to reject pending session status. Official references: https://clerk.com/docs/guides/development/custom-flows/authentication/session-tasks and https://clerk.com/docs/guides/development/custom-flows/organizations/organization-switcher and https://clerk.com/docs/guides/organizations/create-and-manage. No dashboard membership/security setting was changed.
