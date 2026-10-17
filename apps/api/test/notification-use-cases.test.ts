import assert from 'node:assert/strict';
import {test} from 'node:test';

import {IssueIdentityGrant} from '../src/modules/notifications/application/issue-identity-grant';
import {VerifyReadiness} from '../src/modules/notifications/application/verify-readiness';
import {HmacBudgetKeys} from '../src/modules/notifications/infrastructure/hmac-budget-keys';
import {notificationSession, NotificationTestClock} from './notifications-fixtures';

void test('S11 HMAC budget keys span sessions but isolate app/account/operation without identifiers', () => {
  const keys = new HmacBudgetKeys('app', 'fixture-hmac-secret');
  const first = keys.account('user-a', 'grant');

  assert.match(first, /^app:app:account:[a-f0-9]{64}:grant$/);
  assert.doesNotMatch(first, /user-a|fixture-hmac-secret/);
  assert.notEqual(first, keys.account('user-b', 'grant'));
  assert.notEqual(first, keys.account('user-a', 'readiness'));
  assert.notEqual(
    first,
    new HmacBudgetKeys('other', 'fixture-hmac-secret').account('user-a', 'grant'),
  );
});

void test('S11 grant reserves account budget before signing and rejects without signing', async () => {
  let signed = 0;
  let interval = 0;
  const grant = {externalId: 'user_test_a', token: 'synthetic', expiresAt: 'future'};
  const budget = {
    reserve: async (_key: string, ms: number) => {
      interval = ms;
    },

    defer: async () => {},

    cleanup: async () => 0,
  };
  const issuer = new IssueIdentityGrant(
    {
      sign: async () => {
        assert.equal(interval, 5000);
        signed++;

        return grant;
      },
    },
    budget,
    new HmacBudgetKeys('app', 'secret'),
  );

  assert.deepEqual(await issuer.execute(notificationSession), grant);
  assert.equal(signed, 1);
  budget.reserve = async () => {
    throw new Error('budget unavailable');
  };
  await assert.rejects(issuer.execute(notificationSession));
  assert.equal(signed, 1);
});

void test('S11 same context coalesces only in-flight readiness and failures release entries', async () => {
  let calls = 0;
  let reservations = 0;
  let resolve: ((value: boolean) => void) | undefined;
  let promise = new Promise<boolean>((done) => {
    resolve = done;
  });
  const clock = new NotificationTestClock();
  const budget = {
    reserve: async (_key: string, ms: number) => {
      assert.equal(ms, 1000);
      reservations++;
    },

    defer: async () => {},

    cleanup: async () => 0,
  };
  const verifier = new VerifyReadiness(
    {
      read: async () => {
        calls++;

        return promise;
      },
    },
    budget,
    new HmacBudgetKeys('app', 'secret'),
    clock,
  );
  const query = {subscriptionId: 'synthetic-installation', platform: 'android' as const};
  const first = verifier.execute(notificationSession, query);
  const second = verifier.execute(notificationSession, query);

  await new Promise((done) => setImmediate(done));
  resolve?.(true);

  const values = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.equal(reservations, 1);
  assert.deepEqual(values, [
    {status: 'ready', checkedAt: new Date(clock.now()).toISOString(), validForSeconds: 60},
    {status: 'ready', checkedAt: new Date(clock.now()).toISOString(), validForSeconds: 60},
  ]);
  promise = Promise.resolve(false);
  assert.equal((await verifier.execute(notificationSession, query)).validForSeconds, 0);
  assert.equal(calls, 2);
  promise = Promise.reject(new Error('provider failure'));
  await assert.rejects(verifier.execute(notificationSession, query));
  promise = Promise.resolve(true);
  assert.equal((await verifier.execute(notificationSession, query)).status, 'ready');
  assert.equal(calls, 4);
});
