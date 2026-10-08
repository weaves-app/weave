import './dom';

import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, fireEvent, render} from '@testing-library/react';

import {AuthShell} from '../src/features/auth/presentation/auth-shell';

Object.defineProperty(window, 'matchMedia', {
  configurable: true,

  value: (query: string) =>
    Object.assign(new window.EventTarget(), {
      matches: !query.includes('reduced'),
      media: query,
    }),
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

void test('WEA-10 S18 bag remains static after image readiness and pointer movement', () => {
  const view = render(
    <AuthShell>
      <h2>Choose your organization</h2>
    </AuthShell>,
  );
  const image = view.getByAltText('Olive Weave shopping bag with rope handles and folded sides');
  const stage = image.parentElement ?? assert.fail();

  fireEvent.load(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
  fireEvent(stage, new window.MouseEvent('pointermove', {clientX: 200, clientY: 0, bubbles: true}));
  assert.equal(stage.classList.contains('auth-bag-interacting'), false);
  assert.equal(window.sessionStorage.getItem('weave.auth.bag-entrance.v1'), null);
  assert.equal(stage.style.getPropertyValue('--bag-tilt-x'), '');
});
