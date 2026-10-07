import {resolveEntry} from '../../features/auth/application/policy';
import {readClerkConfiguration} from '../../features/auth/infrastructure/configuration';
import {ClerkAuth} from '../../features/auth/presentation/clerk-auth';
import {AuthUnavailable} from '../../features/auth/presentation/auth-unavailable';

export default function Page(): React.JSX.Element {
  if (!readClerkConfiguration(process.env)) return <AuthUnavailable />;
  return <ClerkAuth mode="signup" entry={resolveEntry({})} />;
}
