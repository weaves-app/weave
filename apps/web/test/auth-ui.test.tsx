import './dom';
import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {AuthView} from '../src/features/auth/presentation/auth-view';
import {HomeView} from '../src/features/auth/presentation/home-view';
import type {AuthGateway} from '../src/features/auth/application/contracts';
import {resolveEntry} from '../src/features/auth/application/policy';
const gateway: AuthGateway = {
  google: async () => {},
  current: () => ({stage: 'credentials'}),
  signup: async () => ({stage: 'verification'}),
  signin: async () => ({stage: 'ready', verified: true}),
  invite: async () => ({stage: 'ready', verified: true}),
  sendCode: async () => {},
  verify: async () => ({stage: 'ready', verified: true}),
  activate: async () => '/',
  deactivate: async () => {},
};
afterEach(cleanup);
void test('WEA-10 S01 public form labels/password → verification → Home callback', async () => {
  const routes: string[] = [];
  const view = render(
    <AuthView
      gateway={gateway}
      mode="signup"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      complete={(url) => routes.push(url)}
    />,
  );
  fireEvent.change(view.getByLabelText('Email address'), {target: {value: 'p@example.test'}});
  fireEvent.change(view.getByLabelText('Password'), {target: {value: 'test-password'}});
  fireEvent.submit(
    view.getByRole('button', {name: 'Create account'}).closest('form') ?? assert.fail(),
  );
  await waitFor(() => assert.ok(view.getByLabelText('Verification code')));
  assert.equal(view.queryByLabelText('Password'), null);
  fireEvent.change(view.getByLabelText('Verification code'), {target: {value: '424242'}});
  fireEvent.submit(
    view.getByRole('button', {name: 'Verify email'}).closest('form') ?? assert.fail(),
  );
  await waitFor(() => assert.deepEqual(routes, ['/']));
});
void test('WEA-10 S08 pending/error states disable duplicates, finish loading and allow retry', async () => {
  let reject: (reason: unknown) => void = () => {};
  const response = new Promise<never>((_done, fail) => {
    reject = fail;
  });
  const view = render(
    <AuthView
      gateway={{...gateway, signin: () => response}}
      mode="signin"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      complete={() => {}}
    />,
  );
  fireEvent.change(view.getByLabelText('Email address'), {target: {value: 'p@example.test'}});
  fireEvent.change(view.getByLabelText('Password'), {target: {value: 'password'}});
  fireEvent.submit(view.getByRole('button', {name: 'Sign in'}).closest('form') ?? assert.fail());
  assert.equal(view.getByRole('button', {name: 'Sign in'}).hasAttribute('disabled'), true);
  reject({code: 'form_password_incorrect'});
  await waitFor(() => assert.match(view.getByRole('alert').textContent ?? '', /incorrect/i));
  assert.equal(view.getByRole('button', {name: 'Sign in'}).hasAttribute('disabled'), false);
});
void test('WEA-10 S07 Home stays hidden until auth resolves and after signout; signout failure recovers', async () => {
  let calls = 0;
  let signedOut = 0;
  const props = {
    loaded: false,
    signedIn: false,
    signOut: async () => {
      if (++calls === 1) throw new Error('offline');
    },
    signedOut: () => {
      signedOut++;
    },
  };
  const view = render(<HomeView {...props} />);
  assert.equal(view.queryByRole('heading', {name: 'Home'}), null);
  assert.ok(view.getByRole('status'));
  view.rerender(<HomeView {...props} loaded signedIn />);
  assert.ok(view.getByRole('heading', {name: 'Home'}));
  fireEvent.click(view.getByRole('button', {name: 'Sign out'}));
  await waitFor(() => assert.ok(view.getByRole('alert')));
  fireEvent.click(view.getByRole('button', {name: 'Sign out'}));
  await waitFor(() => assert.equal(signedOut, 1));
  view.rerender(<HomeView {...props} loaded signedIn={false} />);
  assert.equal(view.queryByRole('heading', {name: 'Home'}), null);
});

void test('WEA-10 S01/S07 signed-in unverified session never renders Home', () => {
  const view = render(
    <HomeView loaded signedIn verified={false} signOut={async () => {}} signedOut={() => {}} />,
  );
  assert.ok(
    view.queryByRole('heading', {name: 'Home'}) === null,
    'unverified session must not render Home',
  );
});

void test('WEA-10 S07/S08 signout timeout releases loading and offers a retry', async () => {
  const view = render(
    <HomeView
      loaded
      signedIn
      timeoutMilliseconds={5}
      signOut={() => new Promise<void>(() => {})}
      signedOut={() => assert.fail('timed out signout navigation')}
    />,
  );
  fireEvent.click(view.getByRole('button', {name: 'Sign out'}));
  await waitFor(() => assert.match(view.getByRole('alert').textContent ?? '', /try again/i), {
    timeout: 100,
  });
  assert.equal(view.getByRole('button', {name: 'Sign out'}).hasAttribute('disabled'), false);
});

void test('WEA-10 S08 unknown-account error survives refreshed SDK resources and callbacks', async () => {
  const props = {
    gateway: {
      ...gateway,
      signin: async () => {
        throw {code: 'api_response_error', errors: [{code: 'form_identifier_not_found'}]};
      },
    },
    mode: 'signin' as const,
    entry: resolveEntry({}),
    loaded: true,
    signedIn: false,
    complete: () => assert.fail('failed login cannot navigate'),
  };
  const view = render(<AuthView {...props} />);
  fireEvent.change(view.getByLabelText('Email address'), {target: {value: 'missing@example.test'}});
  fireEvent.change(view.getByLabelText('Password'), {target: {value: 'password'}});
  fireEvent.submit(view.getByRole('button', {name: 'Sign in'}).closest('form') ?? assert.fail());
  await waitFor(() => assert.match(view.getByRole('alert').textContent ?? '', /incorrect/i));
  view.rerender(
    <AuthView
      {...props}
      gateway={{...props.gateway}}
      complete={() => assert.fail('cannot navigate')}
    />,
  );
  assert.match(view.getByRole('alert').textContent ?? '', /incorrect/i);
  assert.equal(view.getByRole('button', {name: 'Sign in'}).hasAttribute('disabled'), false);
});

void test('WEA-10 S08 pending organization task is explicit and cannot show a fresh login or Home', () => {
  const view = render(
    <AuthView
      gateway={gateway}
      mode="signin"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      pendingTask="choose-organization"
      complete={(url) => assert.equal(url, '/organizations')}
    />,
  );
  assert.match(view.getByRole('status').textContent ?? '', /organizations/i);
  assert.equal(view.queryByLabelText('Password'), null);
  assert.equal(view.queryByRole('link', {name: 'Go to Home'}), null);
});

void test('WEA-10 S07 server auth hydration cannot show credentials before browser SDK loads', () => {
  const view = render(
    <AuthView
      gateway={gateway}
      mode="signin"
      entry={resolveEntry({})}
      loaded
      sdkLoaded={false}
      signedIn={false}
      complete={(url) => assert.equal(url, '/organizations')}
    />,
  );
  assert.equal(view.queryByLabelText('Password'), null);
  assert.match(view.getByRole('status').textContent ?? '', /loading/i);
});
