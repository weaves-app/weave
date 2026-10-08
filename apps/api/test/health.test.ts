import assert from 'node:assert/strict';
import {test} from 'node:test';

import {HealthService} from '../src/modules/health/application/health.service';

void test('S06 liveness does not depend on database; readiness checks database', async () => {
  let calls = 0;
  const service = new HealthService({
    ping: async () => {
      calls++;
    },
  });

  assert.deepEqual(service.live(), {status: 'ok', service: 'weave-api'});
  assert.equal(calls, 0);
  assert.deepEqual(await service.ready(), {status: 'ok', database: 'connected'});
  assert.equal(calls, 1);
});

void test('S06 unavailable database rejects readiness but preserves liveness', async () => {
  const service = new HealthService({
    ping: async () => {
      throw new Error('offline');
    },
  });

  await assert.rejects(service.ready(), /offline/);
  assert.equal(service.live().status, 'ok');
});
