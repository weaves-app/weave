import './dom';

import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';

import {AuthView} from '../src/features/auth/presentation/auth-view';
import {AuthUnavailable} from '../src/features/auth/presentation/auth-unavailable';
import {resolveEntry} from '../src/features/auth/application/policy';
import type {AuthGateway, AuthMode} from '../src/features/auth/application/contracts';

afterEach(cleanup);

function port(google: (mode: AuthMode) => Promise<void>): AuthGateway {
  return {
    current: () => ({stage: 'credentials'}),

    signup: async () => ({stage: 'verification'}),

    signin: async () => ({stage: 'ready', verified: true}),

    invite: async () => ({stage: 'unsupported'}),

    google,

    sendCode: async () => {},

    verify: async () => ({stage: 'ready', verified: true}),

    activate: async () => assert.fail('Google initiation must not activate an account'),

    deactivate: async () => {},
  };
}

void test('WEA-10 S11/S12 branded Google signup rejects duplicate clicks, then recovers provider failure', async () => {
  let calls = 0;

  let reject: (error: unknown) => void = () => {};

  const promise = new Promise<void>((_resolve, fail) => {
    reject = fail;
  });
  const view = render(
    <AuthView
      gateway={port(async (mode) => {
        assert.equal(mode, 'signup');
        calls++;
        await promise;
      })}
      mode="signup"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      complete={() => assert.fail('premature Home')}
    />,
  );

  assert.ok(view.getByRole('img', {name: 'Weave'}));
  assert.ok(view.getByRole('heading', {name: 'Everything, woven together.'}));
  assert.ok(view.getByRole('heading', {name: 'Create your account'}));

  const button = view.getByRole('button', {name: 'Continue with Google'});

  fireEvent.click(button);
  fireEvent.click(button);
  assert.equal(calls, 1);
  assert.ok(button.hasAttribute('disabled'));
  assert.ok(view.getByRole('button', {name: 'Create account'}).hasAttribute('disabled'));
  reject({code: 'oauth_access_denied'});
  await waitFor(() => assert.match(view.getByRole('alert').textContent ?? '', /try again/i));
  assert.equal(button.hasAttribute('disabled'), false);
});

void test('WEA-10 S11 Google signin starts provider authentication without premature Home', async () => {
  const modes: AuthMode[] = [];
  const view = render(
    <AuthView
      gateway={port(async (mode) => {
        modes.push(mode);
      })}
      mode="signin"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      complete={() => assert.fail('premature Home')}
    />,
  );

  fireEvent.click(view.getByRole('button', {name: 'Continue with Google'}));
  await waitFor(() => assert.deepEqual(modes, ['signin']));
});

void test('WEA-10 S12 missing configuration retains branding and offers no fake signup success', () => {
  const view = render(<AuthUnavailable />);

  assert.ok(view.getByRole('img', {name: 'Weave'}));
  assert.ok(view.getByRole('alert'));
  assert.equal(view.queryByRole('heading', {name: 'Home'}), null);
});
