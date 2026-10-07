import {ClerkCallback} from '../../features/auth/presentation/clerk-callback';
import {AuthUnavailable} from '../../features/auth/presentation/auth-unavailable';
import {readClerkConfiguration} from '../../features/auth/infrastructure/configuration';

export default function Page(): React.JSX.Element {
  return readClerkConfiguration(process.env) ? <ClerkCallback /> : <AuthUnavailable />;
}
