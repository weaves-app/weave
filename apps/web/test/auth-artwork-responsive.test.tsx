import './dom';

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';

import {authTokens} from '@weave/design-tokens';

import {AuthArtwork} from '../src/features/auth/presentation/artwork/auth-artwork';

const still = '/brand/woven/still.v1.webp';

void test('WEA-24 S11 server markup limits the full still preload to the visible hero', () => {
  const markup = document.createElement('template');

  markup.innerHTML = renderToStaticMarkup(<AuthArtwork />);

  const preloads = markup.content.querySelectorAll(`link[rel="preload"][href="${still}"]`);

  assert.ok(preloads.length > 0, 'desktop keeps its early artwork request without JavaScript');

  for (const preload of preloads)
    assert.equal(
      preload.getAttribute('media'),
      `(min-width: ${authTokens.layout.heroMinWidthPx}px)`,
    );
});

void test('WEA-24 S11 hidden mobile hero selects an embedded image without a network fallback', () => {
  const markup = document.createElement('template');

  markup.innerHTML = renderToStaticMarkup(<AuthArtwork />);

  const mobile = markup.content.querySelector('picture source');
  const desktop = markup.content.querySelector('picture img');

  assert.ok(mobile, 'native picture selection works before hydration and without JavaScript');
  assert.ok(desktop, 'picture retains its desktop fallback image');
  assert.equal(
    mobile.getAttribute('media'),
    `(max-width: ${authTokens.layout.heroMinWidthPx - 1}px)`,
  );
  assert.match(mobile.getAttribute('srcset') ?? '', /^data:image\//);
  assert.equal(desktop?.getAttribute('src'), still, 'desktop keeps the approved image bytes');
  assert.equal(
    desktop.getAttribute('sizes'),
    null,
    'unoptimized image has no misleading sizes hint',
  );
});
