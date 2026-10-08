'use client';

import {useAuth, useClerk, useSignIn, useSignUp} from '@clerk/nextjs';
import {useCallback, useLayoutEffect, useState} from 'react';

import {createLiveResources} from '../infrastructure/live-resources';

import {useRouter} from 'next/navigation';

import type {ClerkResources} from '../infrastructure/clerk-gateway';
import {createClerkGateway} from '../infrastructure/clerk-gateway';
import type {AuthEntry} from '../application/policy';
import type {AuthMode} from '../application/contracts';
import {AuthView} from './auth-view';
import {HomeView} from './home-view';

export interface ClerkAuthProps {
  readonly mode: AuthMode;
  readonly entry: AuthEntry;
}

export function ClerkAuth({mode, entry}: ClerkAuthProps): React.JSX.Element {
  const auth = useAuth();
  const clerk = useClerk();
  const {signUp} = useSignUp();
  const {signIn} = useSignIn();
  const router = useRouter();

  const [resources] = useState(() =>
    createLiveResources<ClerkResources>({
      signUp,
      signIn,

      signOut: () => clerk.signOut(),
    }),
  );

  useLayoutEffect(() => {
    resources.update({
      signUp,
      signIn,

      signOut: () => clerk.signOut(),
    });
  }, [resources, signUp, signIn, clerk]);

  const [gateway] = useState(() =>
    createClerkGateway({
      get signUp() {
        return resources.current.signUp;
      },

      get signIn() {
        return resources.current.signIn;
      },

      signOut: () => resources.current.signOut(),
    }),
  );

  const complete = useCallback(
    (url: string): void => {
      if (url.startsWith('https://')) window.location.assign(url);
      else {
        router.replace(url);
        router.refresh();
      }
    },
    [router],
  );

  return (
    <AuthView
      gateway={gateway}
      mode={mode}
      entry={entry}
      loaded={auth.isLoaded}
      sdkLoaded={clerk.loaded}
      signedIn={auth.isSignedIn === true}
      pendingTask={clerk.session?.currentTask?.key}
      complete={complete}
    />
  );
}

export interface ClerkHomeProps {
  readonly verified: boolean;
}

export function ClerkHome({verified}: ClerkHomeProps): React.JSX.Element {
  const auth = useAuth();
  const clerk = useClerk();
  const router = useRouter();

  return (
    <HomeView
      verified={verified}
      loaded={auth.isLoaded}
      signedIn={auth.isSignedIn === true}
      signOut={() => clerk.signOut()}
      signedOut={() => {
        router.replace('/sign-in');
        router.refresh();
      }}
    />
  );
}
