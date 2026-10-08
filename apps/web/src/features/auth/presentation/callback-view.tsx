'use client';

import {useEffect, useState} from 'react';

import type {CallbackResult} from '../application/contracts';
import {AuthShell} from './auth-shell';

export interface CallbackViewProps {
  readonly loaded?: boolean;
  readonly finish: () => Promise<CallbackResult>;
  readonly navigate: (url: string) => void;
  readonly timeoutMilliseconds?: number;
}

export function CallbackView({
  loaded = true,
  finish,
  navigate,
  timeoutMilliseconds = 30000,
}: CallbackViewProps): React.JSX.Element {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      cancelled = true;
      setError('Google authentication timed out. Please try again.');
    }, timeoutMilliseconds);

    void finish()
      .then((result) => {
        if (cancelled) return;

        clearTimeout(timer);

        if (result.destination) navigate(result.destination);
        else setError(result.error ?? 'Google authentication could not finish. Please try again.');
      })
      .catch(() => {
        if (cancelled) return;

        clearTimeout(timer);
        setError('Google authentication could not finish. Check your connection and try again.');
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, finish, navigate, timeoutMilliseconds]);

  return (
    <AuthShell>
      <h2>{error ? 'Let’s try again' : 'Completing sign-in'}</h2>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : (
        <p role="status">
          {loaded ? 'Finishing your Google authentication…' : 'Loading authentication…'}
        </p>
      )}
      {error && (
        <a className="auth-primary" href="/sign-up">
          Try Google again
        </a>
      )}
      <a className="auth-cancel" href="/sign-in">
        Return to sign in
      </a>
      <div id="clerk-captcha" />
    </AuthShell>
  );
}
