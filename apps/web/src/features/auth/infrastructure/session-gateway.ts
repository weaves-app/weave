import {CLERK_VERIFIED_STATUS, CLERK_PENDING_STATUS} from './clerk-constants';

import type {SessionGateway} from '../application/policy';

export interface ServerSessionPort {
  readAuth(): Promise<unknown>;
  readUser(): Promise<unknown>;
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

export function createSessionGateway(port: ServerSessionPort): SessionGateway {
  return {
    read: async () => {
      const auth = await port.readAuth();

      if (!record(auth) || typeof auth.userId !== 'string' || !auth.userId)
        return {userId: null, verified: false};

      const user = await port.readUser();

      if (!record(user) || user.id !== auth.userId) return {userId: null, verified: false};

      const email = user.primaryEmailAddress;
      const verified =
        record(email) &&
        record(email.verification) &&
        email.verification.status === CLERK_VERIFIED_STATUS;

      return {
        userId: auth.userId,
        verified,
        organizationId:
          auth.sessionStatus !== CLERK_PENDING_STATUS &&
          typeof auth.orgId === 'string' &&
          auth.orgId
            ? auth.orgId
            : null,
      };
    },
  };
}
