import {redirect} from 'next/navigation';

import {readAccess} from '../features/auth/application/policy';
import {serverSessionGateway} from '../features/auth/infrastructure/server-session';
import {ClerkHome} from '../features/auth/presentation/clerk-auth';
import {AuthUnavailable} from '../features/auth/presentation/auth-unavailable';

export const dynamic = 'force-dynamic';

export default async function Home(): Promise<React.JSX.Element> {
  const access = await readAccess(serverSessionGateway());

  if (access.status === 'unavailable') return <AuthUnavailable />;

  if (access.status === 'anonymous') redirect('/sign-in');

  if (access.status === 'organization-required') redirect('/organizations');

  return <ClerkHome verified={access.status === 'authenticated'} />;
}
