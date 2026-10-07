'use client';

import {useEffect, useLayoutEffect, useState, useSyncExternalStore} from 'react';
import type {FormEvent} from 'react';
import {SignOutControl} from './home-view';
import {AuthShell} from './auth-shell';
import {GoogleButton} from './google-button';
import {pendingTaskMessage} from '../application/session-task';
import {createAuthFlow} from '../application/flow';
import type {AuthGateway, AuthMode} from '../application/contracts';
import type {AuthEntry} from '../application/policy';
export interface AuthViewProps {
  readonly gateway: AuthGateway;
  readonly mode: AuthMode;
  readonly entry: AuthEntry;
  readonly loaded: boolean;
  readonly sdkLoaded?: boolean;
  readonly signedIn: boolean;
  readonly pendingTask?: string;
  readonly complete: (url: string) => void;
}
function AuthForm({gateway, mode, complete}: AuthViewProps): React.JSX.Element {
  const [flow] = useState(() => createAuthFlow(gateway, {mode, complete}));
  useLayoutEffect(() => flow.rebind(gateway, complete), [flow, gateway, complete]);
  const state = useSyncExternalStore(flow.subscribe, flow.getSnapshot, flow.getSnapshot);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => () => flow.cancel(), [flow]);
  const verification = state.stage === 'verification';
  const signin = mode === 'signin';
  const title = verification ? 'Check your inbox' : signin ? 'Welcome back' : 'Create your account';
  const disabled = state.pending || state.stage === 'complete';
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const field = (name: string): string => {
      const value = values.get(name);
      return typeof value === 'string' ? value : '';
    };
    const operation = verification
      ? flow.verify(field('code'))
      : flow.submit({email: field('email'), password: field('password')});
    void operation.then(() => {
      if (flow.getSnapshot().stage !== 'credentials') form.reset();
    });
  };
  return (
    <AuthShell>
      <h2>{title}</h2>
      <p className="auth-intro">
        {verification
          ? 'Enter the six-digit code sent to your email.'
          : signin
            ? 'Sign in to your Weave workspace.'
            : 'A place for everything you’re making.'}
      </p>
      {state.error && (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      )}
      <form onSubmit={submit} aria-busy={state.pending}>
        {verification ? (
          <label>
            Verification code
            <input
              className="auth-code"
              name="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              required
              autoFocus
            />
          </label>
        ) : state.stage === 'ready' ? (
          <p>Authentication is ready. Continue to Home.</p>
        ) : (
          <>
            <GoogleButton
              disabled={disabled}
              onClick={() => {
                void flow.google();
              }}
            />
            <div className="auth-divider">or continue with email</div>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                disabled={disabled}
                required
              />
            </label>
            <label>
              Password
              <span className="auth-password">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={signin ? 'current-password' : 'new-password'}
                  placeholder="Enter your password"
                  disabled={disabled}
                  required
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  disabled={disabled}
                  onClick={() => {
                    setShowPassword(!showPassword);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3-6 10-6 10 6 10 6-3 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </span>
            </label>
          </>
        )}
        <button className="auth-primary" type="submit" disabled={disabled}>
          {verification
            ? 'Verify email'
            : state.stage === 'ready'
              ? 'Continue'
              : signin
                ? 'Sign in'
                : 'Create account'}
        </button>
        <p className="auth-status" role="status" aria-live="polite">
          {state.pending ? 'Please wait…' : state.stage === 'complete' ? 'Opening Home…' : ''}
        </p>
      </form>
      {verification && (
        <button
          className="auth-resend"
          type="button"
          disabled={disabled}
          onClick={() => {
            void flow.resend();
          }}
        >
          Resend code
        </button>
      )}
      <nav className="auth-switch" aria-label="Authentication">
        {signin ? (
          <>
            New to Weave?{' '}
            <a href="/sign-up" onClick={flow.cancel}>
              Create an account
            </a>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <a href="/sign-in" onClick={flow.cancel}>
              Sign in
            </a>
          </>
        )}
      </nav>
      {verification && (
        <a className="auth-cancel" href={signin ? '/sign-in' : '/sign-up'} onClick={flow.cancel}>
          Start again
        </a>
      )}
      {!signin && <div id="clerk-captcha" />}
    </AuthShell>
  );
}
export function AuthView(props: AuthViewProps): React.JSX.Element {
  const {loaded, sdkLoaded, pendingTask, signedIn, complete} = props;
  useEffect(() => {
    if (
      loaded &&
      sdkLoaded !== false &&
      (pendingTask === 'choose-organization' || (signedIn && !pendingTask))
    )
      complete('/organizations');
  }, [loaded, sdkLoaded, pendingTask, signedIn, complete]);
  if (!props.loaded || props.sdkLoaded === false)
    return (
      <AuthShell>
        <p role="status">Loading authentication…</p>
      </AuthShell>
    );
  if (props.pendingTask === 'choose-organization' || (props.signedIn && !props.pendingTask))
    return (
      <AuthShell>
        <p role="status">Opening your organizations…</p>
      </AuthShell>
    );
  if (props.pendingTask)
    return (
      <AuthShell>
        <h2>Account setup required</h2>
        <p className="auth-error" role="alert">
          {pendingTaskMessage(props.pendingTask)}
        </p>
        <SignOutControl
          signOut={() => props.gateway.deactivate()}
          signedOut={() => window.location.reload()}
        />
      </AuthShell>
    );
  if (props.signedIn)
    return (
      <AuthShell>
        <h2>You are signed in</h2>
        <a href="/">Go to Home</a>
        <SignOutControl
          signOut={() => props.gateway.deactivate()}
          signedOut={() => window.location.reload()}
        />
      </AuthShell>
    );
  return <AuthForm key={props.mode} {...props} />;
}
