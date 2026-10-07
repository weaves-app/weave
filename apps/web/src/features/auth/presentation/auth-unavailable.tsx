import {AuthShell} from './auth-shell';
export function AuthUnavailable(): React.JSX.Element {
  return (
    <AuthShell>
      <h2>Authentication unavailable</h2>
      <p role="alert">Authentication is temporarily unavailable. Please try again later.</p>
      <a href="">Try again</a>
    </AuthShell>
  );
}
