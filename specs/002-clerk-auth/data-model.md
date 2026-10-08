# Web authentication state

Account identity belongs to Clerk; email substitution is excluded from invitation requests. A verified primary email is required for protected access.

Auth attempt fields: mode (signup/signin/invitation), immutable ticket context, stage (credentials/verification/ready/complete), pending boolean, recoverable message. No passwords/codes stored in application snapshots; UI clears them on transitions/unmount. Provider attempt restoration supplies pending email verification or ready-to-finalize state.

Lifecycle: credentials → pending → verification → pending → complete → session; provider errors return to previous recoverable stage. Repeated submissions while pending do nothing. Cancellation invalidates operation generation; stale results do not activate, navigate or update UI. Cancellation during activation is followed by session deactivation.

Session: unresolved/anonymous/invalid/unverified/authenticated. Home and protected resource accept only authenticated verified identity. Failure or signout denies access.

## Current revision

Active auth modes are signup/signin. Historical invitation mode remains internally dormant with no public route; organization membership entities are deferred. Google authentication delegates identity, transfers, consent, verification and session creation to Clerk. Initiation adds no account-success state to the authored coordinator: Home requires the existing independently verified server session. Shared pending state guards competing Google/password submissions.

## Organization revision (supersedes deferred membership above)

OrganizationOption: id/name/role and optional invitationId; memberships and pending invitations share one picker collection. Clerk owns the organization and membership records. OrganizationSnapshot: immutable visible options, selectedId, loading, pending, error, and known created organization for activation retry. No organization records are authored in the business database. Server identity adds active organizationId; pending sessions never qualify for protected access. Fresh signin chooses organization; Home reload keeps the active organization.
