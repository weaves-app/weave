import assert from 'node:assert/strict';
import {test} from 'node:test';

import {readHealth} from '../src/lib/health-client';

void test('S07 client accepts valid health and rejects bad responses safely', async () => {
  const response = (ok: boolean, body: unknown) => ({
    get: async () => ({
      ok,

      json: async () => body,
    }),
  });

  assert.equal(
    await readHealth(response(true, {status: 'ok', service: 'weave-api'}), 'url'),
    'Connected',
  );

  for (const body of [null, {}, 'ok', {status: 'ok'}, {status: 'ok', service: 9}])
    assert.equal(await readHealth(response(true, body), 'url'), 'Unavailable');

  assert.equal(
    await readHealth(response(false, {status: 'ok', service: 'weave-api'}), 'url'),
    'Unavailable',
  );
  assert.equal(
    await readHealth(
      {
        get: async () => {
          throw new Error('timeout');
        },
      },
      'url',
    ),
    'Unavailable',
  );
  assert.equal(
    await readHealth(
      {
        get: async () => ({
          ok: true,

          json: async () => {
            throw new Error('bad json');
          },
        }),
      },
      'url',
    ),
    'Unavailable',
  );
});
