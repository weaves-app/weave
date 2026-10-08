import assert from 'node:assert/strict';
import {test} from 'node:test';

import {createSessionGateway} from '../src/features/auth/infrastructure/session-gateway';
import {serveSession} from '../src/features/auth/application/session-response';

void test('WEA-10 S02/S07 protected resource is no-store and requires verified matching session user', async () => {
  const user = {id: 'user', primaryEmailAddress: {verification: {status: 'verified'}}};
  const response = await serveSession(
    createSessionGateway({
      readAuth: async () => ({userId: 'user', orgId: 'org'}),

      readUser: async () => user,
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {authenticated: true});

  for (const data of [
    null,
    {},
    {...user, id: 'other'},
    {...user, primaryEmailAddress: null},
    {...user, primaryEmailAddress: {verification: {status: 'unverified'}}},
  ]) {
    const denied = await serveSession(
      createSessionGateway({
        readAuth: async () => ({userId: 'user', orgId: 'org'}),

        readUser: async () => data,
      }),
    );

    assert.equal(denied.status, 401);
  }
});

void test('WEA-10 S02 signed-out protected request avoids user lookup; outage is 503', async () => {
  const denied = await serveSession(
    createSessionGateway({
      readAuth: async () => ({userId: null}),

      readUser: async () => assert.fail('signed-out lookup'),
    }),
  );

  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'no-store');

  const outage = await serveSession(
    createSessionGateway({
      readAuth: async () => {
        throw new Error('network');
      },

      readUser: async () => null,
    }),
  );

  assert.equal(outage.status, 503);
});

void test('WEA-10 S15 verified identity without an active organization cannot read protected resources', async () => {
  const user = {id: 'user', primaryEmailAddress: {verification: {status: 'verified'}}};
  const denied = await serveSession(
    createSessionGateway({
      readAuth: async () => ({userId: 'user', orgId: null}),

      readUser: async () => user,
    }),
  );

  assert.equal(denied.status, 401);
});
