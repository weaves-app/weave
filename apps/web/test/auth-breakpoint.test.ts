import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

import {authTokens} from '@weave/design-tokens';

for (const [stylesheet, selector] of [
  ['../src/app/globals.css', '.auth-scene'],
  ['../src/features/auth/presentation/artwork/auth-artwork.module.css', '.stage[data-phase]'],
] as const) {
  void test(`WEA-24 S11 ${stylesheet} follows the shared hero breakpoint`, () => {
    const css = readFileSync(new URL(stylesheet, import.meta.url), 'utf8');
    const heroRule = css
      .split('@media')
      .slice(1)
      .find((rule) => rule.includes(selector));
    const boundary = /\(max-width: (\d+)px\)/.exec(heroRule ?? '');

    assert.ok(boundary, 'the hero visibility rule has a mobile width boundary');
    assert.equal(Number(boundary[1]), authTokens.layout.heroMinWidthPx - 1);
  });
}
