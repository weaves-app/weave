import {redirect} from 'next/navigation';

import {readAccess} from '../features/auth/application/policy';
import {serverSessionGateway} from '../features/auth/infrastructure/server-session';
import {ClerkHome} from '../features/auth/presentation/clerk-auth';
import {AuthUnavailable} from '../features/auth/presentation/auth-unavailable';

import {ACCESS_STATUS} from '../features/auth/application/auth-constants';

export const dynamic = 'force-dynamic';

export default async function Home(): Promise<React.JSX.Element> {
  const access = await readAccess(serverSessionGateway());

  if (access.status === ACCESS_STATUS.UNAVAILABLE) return <AuthUnavailable />;

  if (access.status === ACCESS_STATUS.ANONYMOUS) redirect('/sign-in');

  if (access.status === ACCESS_STATUS.ORGANIZATION_REQUIRED) redirect('/organizations');

  return <ClerkHome verified={access.status === ACCESS_STATUS.AUTHENTICATED} />;
}
