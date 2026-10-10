export const MAX_INVITATION_TICKET_LENGTH = 8192;

export const INVITATION_SIGN_UP_STATUS = 'sign_up';

export const INVITATION_SIGN_IN_STATUS = 'sign_in';

export interface AuthEntry {
  readonly kind: 'public' | 'invitation' | 'invalid';
  readonly ticket?: string;
  readonly signInUrl: string;
  readonly signUpUrl: string;
}

export interface SessionIdentity {
  readonly userId: string | null;
  readonly verified: boolean;
  readonly organizationId?: string | null;
}

export interface SessionGateway {
  read(): Promise<SessionIdentity>;
}

export interface AccessResult {
  readonly status:
    'authenticated' | 'anonymous' | 'unverified' | 'unavailable' | 'organization-required';
}

export function resolveEntry(
  search: Readonly<Record<string, string | readonly string[] | undefined>>,
  invitationRequired = false,
): AuthEntry {
  const defaults = {signInUrl: '/sign-in', signUpUrl: '/sign-up'};
  const ticket = search.__clerk_ticket;
  const status = search.__clerk_status;

  if (ticket === undefined && status === undefined && !invitationRequired) {
    return {kind: 'public', ...defaults};
  }

  if (
    typeof ticket !== 'string' ||
    !ticket ||
    ticket.length > MAX_INVITATION_TICKET_LENGTH ||
    /\s/.test(ticket) ||
    (status !== undefined &&
      status !== INVITATION_SIGN_UP_STATUS &&
      status !== INVITATION_SIGN_IN_STATUS)
  ) {
    return {kind: 'invalid', ...defaults};
  }

  const query = new URLSearchParams({__clerk_ticket: ticket}).toString();

  return {
    kind: 'invitation',
    ticket,
    signInUrl: `/sign-in?${query}`,
    signUpUrl: `/invite?${query}`,
  };
}

export async function readAccess(gateway: SessionGateway): Promise<AccessResult> {
  try {
    const identity = await gateway.read();

    if (!identity.userId) return {status: 'anonymous'};

    if (!identity.verified) return {status: 'unverified'};

    return {status: identity.organizationId ? 'authenticated' : 'organization-required'};
  } catch {
    return {status: 'unavailable'};
  }
}
