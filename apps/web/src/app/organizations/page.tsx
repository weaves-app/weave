import {ClerkOrganizations} from '../../features/organizations/presentation/clerk-organizations';
import {AuthUnavailable} from '../../features/auth/presentation/auth-unavailable';
import {readClerkConfiguration} from '../../features/auth/infrastructure/configuration';

export const dynamic = 'force-dynamic';

export default function Page(): React.JSX.Element {
  if (!readClerkConfiguration(process.env)) return <AuthUnavailable />;

  return <ClerkOrganizations mode="choose" />;
}
