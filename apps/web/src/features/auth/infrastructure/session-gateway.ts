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
        record(email) && record(email.verification) && email.verification.status === 'verified';

      return {
        userId: auth.userId,
        verified,
        organizationId:
          auth.sessionStatus !== 'pending' && typeof auth.orgId === 'string' && auth.orgId
            ? auth.orgId
            : null,
      };
    },
  };
}
