# Implementation Plan: WEA-10 Next.js authentication

**Branch**: `feat/WEA-10/clerk-auth-nextjs-react-native` | **Date**: 2026-10-06 | **Spec**: [spec.md](spec.md)

## Summary

Implement only the Next.js portion owned by Vishnuu. Retain native ticket scenarios as Pravin's separate scope. Clerk Core 3 supplies provider sessions and password/email-code APIs; authored web application flow uses a consumer-owned gateway and explicit composition factory. The revision removes the public `/invite` entry; invitation management is deferred. Protected Home and a session Route Handler independently require a valid session and verified primary email.

## Technical Context

- Language: TypeScript 6.0.3, Node 24.20.0, React 19.2.3, installed Next 16.3.x.
- Dependencies: exact @clerk/nextjs 7.9.11; existing semantic design tokens. No universal/native wrapper.
- Storage: Clerk-managed identity/session; no business database changes or credentials stored by authored code.
- Tests: node:test + tsx for application tests; React Testing Library + JSDOM for public form behavior; actual Next server checks. Live provider acceptance remains separately measured.
- Scope: email/password registration + email-code verification, login + Device Trust email-code when required, Google SSO, restoration, cancellation, retry and signout.
- Constraints: no secret in clients, no build-time public key, no Home before valid verified auth, no provider-account/security changes or provisioning.
- Performance: one in-flight authentication mutation at a time; no polling/business latency target.

## Constitution Check

Web BDD agreement recorded before behavior edits. RED/GREEN/refactor per authored slice with actual output files. Interface gateway isolates framework-free application logic; a named factory composes SDK adapter in client boundary. Server adapters stay outside application. Strict types and runtime unknown validation. Existing tokens and minimal platform UI. Personal local identity verified. No publishing. Checks and convergence mandatory. Post-design: no unresolved constitutional conflicts; native/live prerequisites remain explicit verification obligations.

## Project Structure

- `apps/web/src/features/auth/application/`: contracts, invitation parsing, flow coordinator, access policy.
- `apps/web/src/features/auth/infrastructure/`: Clerk adapter and server session integration.
- `apps/web/src/features/auth/presentation/`: reusable auth form, Home/signout interaction, SDK composition.
- `apps/web/src/app/{sign-in,sign-up,invite}/page.tsx`, root Home, protected `api/session/route.ts`, `src/proxy.ts`.
- `apps/web/test/`: WEA-10 behavioral scenario tests; existing WEA-6 health tests retained.
- Feature docs: research, model, contracts, quickstart, tasks, evidence, convergence.

## Delivery order

First entry/access policy RED/GREEN, then registration/verification and login/invitation/recovery coordinator RED/GREEN, then UI and adapter integration tests, then server protection checks, formatting/lint/typecheck/build/full verify/database integration, then converge. Re-run affected scenarios after edits. Record native as outside this session, never complete overall WEA-10.

## Revision plan — 2026-10-07 (S11 confirmed)

Preserve completed work and its evidence as history. Replace auth presentation with the approved branded shell and shared web form primitives. Add web-scoped semantic colour/font tokens without changing native rendering. Copy Figtree/OFL, supplied logo/favicon and approved generated bag asset into web-owned assets. Use local font loading; do not fetch third-party fonts. Remove current public invitation route and invitation redirects; do not implement organization management.

Google flows use installed Clerk Core 3 SSO APIs researched against official docs and installed declarations, an interface-driven adapter, and a thin callback route. Account activation remains Clerk-controlled; existing server session/verified-email gates protect Home and resource access. No fake provider success or secret build-time values. Unconfigured screens retain approved branding and show an honest unavailable state.

Delivery gate satisfied: user explicitly confirmed S11 before source edits. TDD begins with public UI/OAuth behavior failures; relevant tests after each slice; full verification and database integration before PR. Live Clerk/Google checks require owner configuration and an authorized test identity, using a system browser. No publication or deployment authorized.

## Reported-live regression remediation — 2026-10-07

Within confirmed S07/S08/S11: keep controllers stable across Clerk signal snapshots, bind adapter reads to current resources, prioritize nested provider errors, and wait for browser SDK readiness before resolving callbacks. Replace static callback waiting with a testable result/error/timeout view and an interface-driven public SDK callback adapter. Pending session tasks are shown explicitly; choose-organization is a configuration prerequisite, not a new organization-onboarding feature. Owner changes the development app to Membership optional for this skeletal scope.

## Organization revision plan — approval recorded, behavior confirmation pending

Supersedes Membership optional and the organization-onboarding exclusion above. Keep required membership; custom /organizations and /organizations/create routes reuse AuthShell and semantic tokens. Clerk SDK owns organization membership, invitation acceptance, creation, and active organization. Framework-free consumer-owned gateway/controller isolates list and mutations; paginated memberships/invitations load completely, deduplicate by organization ID, preferring existing membership. Creation retry after activation failure reuses the created organization to prevent duplicates. Use explicit pending-session access only for onboarding; normal protected resources continue to deny pending sessions. Post-authentication callbacks navigate to /organizations, and choose-organization taskUrls point to the same picker. Server Home/API gate active organization. No business database schema or native changes.

Delivery order: confirmed S13–S15 → meaningful routing/access RED → GREEN; organization loading/create/accept/activate/retry/concurrency RED → GREEN; accessible UI RED → GREEN; refactor and relevant scenarios after edits; full verify and database integration; live acceptance and convergence. No publishing/deployment.

S13–S15 confirmed after presentation of nine concrete scenarios. Fresh authentication always selects an organization; reload Home preserves active organization. Analysis: FR-010/011 and SC-005 map to T038–T041; no unresolved requirement or constitution conflict. Existing T034 recommendation superseded. Built-in requirements checklist passed (13/13); no custom checklist. No extension hooks configured.

## Readability revision

Add a shared, dependency-free ESLint readability rule with behavioral fixture RED/GREEN. Apply it to workspace and root JS/TS configs, retain Prettier, autofix authored code without reordering imports or changing logic, document the policy, run full verification and integration, and refresh source review anchors. Native generated sources stay excluded.
