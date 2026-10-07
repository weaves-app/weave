import 'server-only';
import {auth, clerkClient} from '@clerk/nextjs/server';
import {createSessionGateway} from './session-gateway';
import {readClerkConfiguration} from './configuration';
import type {SessionGateway} from '../application/policy';
export function serverSessionGateway(): SessionGateway {
  return createSessionGateway({
    readAuth: async () => {
      if (!readClerkConfiguration(process.env)) throw new Error('Authentication unavailable');
      return auth({treatPendingAsSignedOut: false});
    },
    readUser: async () => {
      const identity = await auth({treatPendingAsSignedOut: false});
      if (!identity.userId) return null;
      return (await clerkClient()).users.getUser(identity.userId);
    },
  });
}
