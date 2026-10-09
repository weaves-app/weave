import './dom';

import assert from 'node:assert/strict';
import {afterEach, beforeEach, mock, test} from 'node:test';
import {act, cleanup, fireEvent, render} from '@testing-library/react';

import {AuthShell} from '../src/features/auth/presentation/auth-shell';
import {AuthView} from '../src/features/auth/presentation/auth-view';
import type {AuthGateway} from '../src/features/auth/application/contracts';
import {resolveEntry} from '../src/features/auth/application/policy';

const desktop = Object.assign(new window.EventTarget(), {matches: true});

const reduced = Object.assign(new window.EventTarget(), {matches: false});

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

function shell(animateArtwork = true) {
  return render(
    <AuthShell {...{animateArtwork}}>
      <h2>Welcome back</h2>
      <input aria-label="Email address" />
    </AuthShell>,
  );
}

function media(view: ReturnType<typeof render>) {
  const video = view.container.querySelector('video');

  assert.ok(video, 'sign-in exposes a native decorative intro video');

  return video;
}

beforeEach(() => {
  desktop.matches = true;
  reduced.matches = false;
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,

    value: (query: string) => (query.includes('reduced') ? reduced : desktop),
  });
  mock.method(window.HTMLMediaElement.prototype, 'play', async () => {});
  mock.method(window.HTMLMediaElement.prototype, 'pause', () => {});
  mock.method(window.HTMLMediaElement.prototype, 'load', () => {});
});

afterEach(() => {
  cleanup();
  mock.restoreAll();
  mock.timers.reset();
});

void test('WEA-24 S01 plays once, leaves the form usable, and settles on the woven still', async () => {
  const play = mock.method(window.HTMLMediaElement.prototype, 'play', async () => {});
  const view = shell();
  const video = media(view);
  const still = view.container.querySelector('img');

  assert.match(video.src, /intro\.v2\.mp4$/);
  assert.ok(still);
  assert.match(still.src, /still\.v1\.webp/);
  assert.equal(still.alt, '');
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
  assert.equal(video.controls, false);
  assert.equal(video.loop, false);
  await act(async () => fireEvent.canPlay(video));
  fireEvent.playing(video);
  assert.equal(video.hidden, false);
  fireEvent.change(view.getByLabelText('Email address'), {target: {value: 'person@example.test'}});
  assert.equal(
    (view.getByLabelText('Email address') as HTMLInputElement).value,
    'person@example.test',
  );
  fireEvent.ended(video);
  fireEvent.canPlay(video);
  fireEvent.playing(video);
  assert.equal(video.hidden, true);
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(play.mock.callCount(), 1);
});

void test('WEA-24 S03 shared shells and signup never request the intro', () => {
  const shared = shell(false);

  assert.equal(shared.container.querySelector('video[src]'), null);
  assert.match(shared.container.querySelector('img')?.src ?? '', /still\.v1\.webp/);
  shared.unmount();

  const signup = render(
    <AuthView
      gateway={gateway}
      mode="signup"
      entry={resolveEntry({})}
      loaded
      signedIn={false}
      complete={() => {}}
    />,
  );

  assert.equal(signup.container.querySelector('video[src]'), null);
});

for (const condition of ['reduced', 'mobile', 'hidden'] as const) {
  void test(`WEA-24 S03 ${condition} initial mount never requests or later starts media`, () => {
    if (condition === 'reduced') reduced.matches = true;

    if (condition === 'mobile') desktop.matches = false;

    if (condition === 'hidden')
      Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});

    const view = shell();
    const video = media(view);

    assert.equal(video.hasAttribute('src'), false);
    reduced.matches = false;
    desktop.matches = true;
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
    act(() => {
      reduced.dispatchEvent(new window.Event('change'));
    });
    act(() => {
      desktop.dispatchEvent(new window.Event('change'));
    });
    fireEvent(document, new window.Event('visibilitychange'));
    fireEvent.canPlay(video);
    assert.equal(video.hasAttribute('src'), false);
    assert.equal(video.hidden, true);
  });
}

void test('WEA-24 S02 readiness expires without a late animation flash', () => {
  mock.timers.enable({apis: ['setTimeout']});

  const play = mock.method(window.HTMLMediaElement.prototype, 'play', async () => {});
  const view = shell();
  const video = media(view);

  act(() => mock.timers.tick(501));
  fireEvent.canPlay(video);
  fireEvent.playing(video);
  assert.equal(video.hasAttribute('src'), false);
  assert.equal(video.hidden, true);
  assert.equal(play.mock.callCount(), 0);
});

void test('WEA-24 S02 rejected autoplay and media errors reveal a terminal still', async () => {
  mock.method(window.HTMLMediaElement.prototype, 'play', async () => {
    throw new Error('Playback blocked');
  });

  const rejected = shell();
  const video = media(rejected);

  await act(async () => fireEvent.canPlay(video));
  assert.equal(video.hidden, true);
  assert.equal(video.hasAttribute('src'), false);
  rejected.unmount();

  const failed = shell();
  const failedVideo = media(failed);

  fireEvent.error(failedVideo);
  fireEvent.canPlay(failedVideo);
  assert.equal(failedVideo.hasAttribute('src'), false);
  assert.equal(failedVideo.hidden, true);
});

for (const condition of ['reduced', 'mobile', 'hidden', 'stalled'] as const) {
  void test(`WEA-24 S02/S03 ${condition} during playback stops permanently`, async () => {
    mock.timers.enable({apis: ['setTimeout']});

    const view = shell();
    const video = media(view);

    await act(async () => fireEvent.canPlay(video));
    fireEvent.playing(video);

    if (condition === 'reduced') {
      reduced.matches = true;
      act(() => {
        reduced.dispatchEvent(new window.Event('change'));
      });
    } else if (condition === 'mobile') {
      desktop.matches = false;
      act(() => {
        desktop.dispatchEvent(new window.Event('change'));
      });
    } else if (condition === 'hidden') {
      Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
      fireEvent(document, new window.Event('visibilitychange'));
    } else {
      act(() => mock.timers.tick(1251));
    }

    fireEvent.playing(video);
    assert.equal(video.hasAttribute('src'), false);
    assert.equal(video.hidden, true);
  });
}

void test('WEA-24 S01 Clerk readiness and refreshed callbacks preserve the playing element', async () => {
  const play = mock.method(window.HTMLMediaElement.prototype, 'play', async () => {});
  const props = {
    gateway,
    mode: 'signin' as const,
    entry: resolveEntry({}),
    loaded: false,
    signedIn: false,

    complete: () => {},
  };
  const view = render(<AuthView {...props} />);
  const video = media(view);

  await act(async () => fireEvent.canPlay(video));
  fireEvent.playing(video);
  view.rerender(<AuthView {...props} loaded gateway={{...gateway}} complete={() => {}} />);
  assert.equal(media(view), video);
  assert.equal(video.hidden, false);
  assert.ok(view.getByLabelText('Email address'));
  fireEvent.click(view.getByRole('button', {name: 'Show password'}));
  assert.equal(media(view), video);
  fireEvent.canPlay(video);
  assert.equal(play.mock.callCount(), 1);
});

void test('WEA-24 S03 unmount releases playback and ignores late events', async () => {
  const pause = mock.method(window.HTMLMediaElement.prototype, 'pause', () => {});
  const play = mock.method(window.HTMLMediaElement.prototype, 'play', async () => {});
  const view = shell();
  const video = media(view);

  await act(async () => fireEvent.canPlay(video));
  view.unmount();
  fireEvent.canPlay(video);
  fireEvent.playing(video);
  assert.equal(video.hasAttribute('src'), false);
  assert.ok(pause.mock.callCount() > 0);
  assert.equal(play.mock.callCount(), 1);
});
