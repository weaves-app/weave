'use client';

import {useRef, useState} from 'react';

export interface SignOutControlProps {
  readonly signOut: () => Promise<void>;
  readonly signedOut: () => void;
  readonly timeoutMilliseconds?: number;
}

export interface HomeViewProps extends SignOutControlProps {
  readonly loaded: boolean;
  readonly signedIn: boolean;
  readonly verified?: boolean;
}

export function SignOutControl({
  signOut,
  signedOut,
  timeoutMilliseconds = 30000,
}: SignOutControlProps): React.JSX.Element {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const perform = async (): Promise<void> => {
    if (busy.current) return;

    busy.current = true;
    setPending(true);
    setError(null);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Sign out timed out')), timeoutMilliseconds);
    });

    try {
      await Promise.race([signOut(), deadline]);
      signedOut();
    } catch {
      setError('Sign out could not finish. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
      busy.current = false;
      setPending(false);
    }
  };

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={pending}
        onClick={() => {
          void perform();
        }}
      >
        Sign out
      </button>
      {pending && <p role="status">Signing out…</p>}
    </>
  );
}

export function HomeView({
  loaded,
  signedIn,
  verified = true,
  timeoutMilliseconds,
  signOut,
  signedOut,
}: HomeViewProps): React.JSX.Element {
  if (!loaded)
    return (
      <main className="home-page">
        <p role="status">Restoring session…</p>
      </main>
    );

  if (!signedIn)
    return (
      <main className="home-page">
        <a href="/sign-in">Sign in</a>
      </main>
    );

  return (
    <main className="home-page">
      {verified ? (
        <h1>Home</h1>
      ) : (
        <>
          <h1>Email verification required</h1>
          <p>Sign out and finish email verification before opening Home.</p>
        </>
      )}
      <SignOutControl
        signOut={signOut}
        signedOut={signedOut}
        timeoutMilliseconds={timeoutMilliseconds}
      />
    </main>
  );
}
