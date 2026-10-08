import './dom';

import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, fireEvent, render} from '@testing-library/react';

import {AuthShell} from '../src/features/auth/presentation/auth-shell';

const key = 'weave.auth.bag-entrance.v1';

let reduced = false;

let desktop = true;

const media = new window.EventTarget();

Object.defineProperty(window, 'matchMedia', {
  configurable: true,

  value: (query: string) =>
    Object.assign(query.includes('reduced') ? media : new window.EventTarget(), {
      matches: query.includes('reduced') ? reduced : desktop,
      media: query,
    }),
});

function shell() {
  const view = render(
    <AuthShell>
      <h2>Choose your organization</h2>
    </AuthShell>,
  );
  const image = view.getByAltText('Olive Weave shopping bag with rope handles and folded sides');
  const stage = image.parentElement ?? assert.fail();

  return {view, image, stage};
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  reduced = false;
  desktop = true;
});

void test('WEA-10 S16 bag turns once after readiness and settles without rerender replay', () => {
  const {view, image, stage} = shell();

  assert.equal(stage.classList.contains('auth-bag-enter'), false);
  fireEvent.load(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), true);
  assert.equal(window.sessionStorage.getItem(key), 'seen');
  fireEvent.animationEnd(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
  fireEvent.load(image);
  view.rerender(
    <AuthShell>
      <h2>Create your organization</h2>
    </AuthShell>,
  );
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
});

void test('WEA-10 S16 later auth/onboarding mounts do not restart the entrance', () => {
  const first = shell();

  fireEvent.load(first.image);
  first.view.unmount();

  const next = shell();

  fireEvent.load(next.image);
  assert.equal(next.stage.classList.contains('auth-bag-enter'), false);
  assert.equal(window.sessionStorage.getItem(key), 'seen');
});

void test('WEA-10 S16 reduced motion remains static', () => {
  reduced = true;

  const {image, stage} = shell();

  fireEvent.load(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
  assert.equal(window.sessionStorage.getItem(key), null);
});

void test('WEA-10 S16 enabling reduced motion stops an active entrance', () => {
  const {image, stage} = shell();

  fireEvent.load(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), true);
  reduced = true;
  Object.assign(media, {matches: true});
  media.dispatchEvent(new window.Event('change'));
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
});

void test('WEA-10 S16 mobile does not consume the desktop entrance', () => {
  desktop = false;

  const {image, stage} = shell();

  fireEvent.load(image);
  assert.equal(stage.classList.contains('auth-bag-enter'), false);
  assert.equal(window.sessionStorage.getItem(key), null);
});

void test('WEA-10 S16 blocked storage leaves the bag static without breaking the page', () => {
  const getItem =
    Object.getOwnPropertyDescriptor(window.Storage.prototype, 'getItem') ?? assert.fail();

  Object.defineProperty(window.Storage.prototype, 'getItem', {
    configurable: true,

    value: () => {
      throw new Error('Blocked');
    },
  });

  try {
    const {image, stage} = shell();

    fireEvent.load(image);
    assert.equal(stage.classList.contains('auth-bag-enter'), false);
    assert.ok(stage.isConnected);
  } finally {
    Object.defineProperty(window.Storage.prototype, 'getItem', getItem);
  }
});

void test('WEA-10 S16 cached image starts its entrance without another load event', () => {
  const prototype = window.HTMLImageElement.prototype;
  const complete = Object.getOwnPropertyDescriptor(prototype, 'complete') ?? assert.fail();
  const width = Object.getOwnPropertyDescriptor(prototype, 'naturalWidth') ?? assert.fail();

  Object.defineProperty(prototype, 'complete', {
    configurable: true,

    get: () => true,
  });
  Object.defineProperty(prototype, 'naturalWidth', {
    configurable: true,

    get: () => 1145,
  });

  try {
    const {stage} = shell();

    assert.equal(stage.classList.contains('auth-bag-enter'), true);
    assert.equal(window.sessionStorage.getItem(key), 'seen');
  } finally {
    Object.defineProperty(prototype, 'complete', complete);
    Object.defineProperty(prototype, 'naturalWidth', width);
  }
});
