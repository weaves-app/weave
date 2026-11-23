import './dom';

import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, render, waitFor} from '@testing-library/react';

import {CallbackView} from '../src/features/auth/presentation/callback-view';

import {EMPTY_TEXT} from './test-constants';

afterEach(cleanup);

void test('WEA-10 S11 callback without a completed attempt shows retry rather than endless verification', async () => {
  const view = render(
    <CallbackView
      finish={async () => ({error: 'Google authentication could not finish. Try again.'})}
      navigate={() => assert.fail('cannot open Home')}
    />,
  );

  await waitFor(() =>
    assert.match(view.getByRole('alert').textContent ?? EMPTY_TEXT, /try again/i),
  );
  assert.equal(view.queryByRole('status'), null);
  assert.ok(view.getByRole('link', {name: 'Try Google again'}));
});

void test('WEA-10 S11 callback rejected operation and timeout recover without navigation', async () => {
  for (const finish of [
    async () => {
      throw new Error('network');
    },
    () => new Promise<{error: string}>(() => {}),
  ]) {
    const view = render(
      <CallbackView
        finish={finish}
        timeoutMilliseconds={5}
        navigate={() => assert.fail('cannot open Home')}
      />,
    );

    await waitFor(() => assert.ok(view.getByRole('alert')), {timeout: 200});
    assert.equal(view.queryByRole('status'), null);
    view.unmount();
  }
});

void test('WEA-10 S11 only completed callback navigates; additional requirements are visible', async () => {
  const routes: string[] = [];
  const view = render(
    <CallbackView finish={async () => ({destination: '/'})} navigate={(url) => routes.push(url)} />,
  );

  await waitFor(() => assert.deepEqual(routes, ['/']));
  view.unmount();

  const incomplete = render(
    <CallbackView
      finish={async () => ({error: 'Google sign-up requires: first name.'})}
      navigate={() => assert.fail('cannot open Home')}
    />,
  );

  await waitFor(() =>
    assert.match(incomplete.getByRole('alert').textContent ?? EMPTY_TEXT, /first name/),
  );
});

void test('WEA-10 S11 callback waits for browser SDK readiness before resolving hydrated server auth', async () => {
  let calls = 0;

  const finish = async () => {
    calls++;

    return {error: 'Try again.'};
  };

  const navigate = () => assert.fail('no Home');

  const view = render(<CallbackView loaded={false} finish={finish} navigate={navigate} />);

  assert.equal(calls, 0);
  assert.match(view.getByRole('status').textContent ?? EMPTY_TEXT, /loading/i);
  view.rerender(<CallbackView loaded finish={finish} navigate={navigate} />);
  await waitFor(() => assert.ok(view.getByRole('alert')));
  assert.equal(calls, 1);
});
