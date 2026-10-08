'use client';

import {useAuth, useClerk, useSignIn, useSignUp} from '@clerk/nextjs';
import {useCallback, useLayoutEffect, useState} from 'react';

import {createLiveResources} from '../infrastructure/live-resources';

import {useRouter} from 'next/navigation';

import {createOAuthGateway} from '../infrastructure/clerk-oauth';
import type {OAuthResources} from '../infrastructure/clerk-oauth';
import {CallbackView} from './callback-view';

export function ClerkCallback(): React.JSX.Element {
  const auth = useAuth();
  const clerk = useClerk();
  const {signUp} = useSignUp();
  const {signIn} = useSignIn();
  const router = useRouter();
  const [resources] = useState(() =>
    createLiveResources<OAuthResources>({
      signUp,
      signIn,
      signedIn: auth.isSignedIn === true,
      pendingTask: clerk.session?.currentTask?.key,

      activateExisting: (sessionId, navigate) => clerk.setActive({session: sessionId, navigate}),
    }),
  );

  useLayoutEffect(() => {
    resources.update({
      signUp,
      signIn,
      signedIn: auth.isSignedIn === true,
      pendingTask: clerk.session?.currentTask?.key,

      activateExisting: (sessionId, navigate) => clerk.setActive({session: sessionId, navigate}),
    });
  }, [resources, signUp, signIn, auth.isSignedIn, clerk]);

  const [gateway] = useState(() =>
    createOAuthGateway({
      get signUp() {
        return resources.current.signUp;
      },

      get signIn() {
        return resources.current.signIn;
      },

      get signedIn() {
        return resources.current.signedIn;
      },

      get pendingTask() {
        return resources.current.pendingTask;
      },

      activateExisting: (sessionId, navigate) =>
        resources.current.activateExisting(sessionId, navigate),
    }),
  );
  const navigate = useCallback(
    (url: string): void => {
      if (url.startsWith('http')) window.location.assign(url);
      else {
        router.replace(url);
        router.refresh();
      }
    },
    [router],
  );

  return (
    <CallbackView
      loaded={auth.isLoaded && clerk.loaded}
      finish={gateway.finish}
      navigate={navigate}
    />
  );
}
