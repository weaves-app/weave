import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readAccess, resolveEntry} from '../src/features/auth/application/policy';

void test('WEA-10 S03/S08 invitation entry preserves opaque ticket across auth navigation', () => {
  const entry = resolveEntry({__clerk_ticket: 'opaque+/token', __clerk_status: 'sign_up'});
  assert.equal(entry.kind, 'invitation');
  assert.equal(entry.ticket, 'opaque+/token');
  assert.equal(
    new URL(entry.signInUrl, 'https://weave.test').searchParams.get('__clerk_ticket'),
    entry.ticket,
  );
  assert.equal(new URL(entry.signUpUrl, 'https://weave.test').pathname, '/invite');
});
void test('WEA-10 S03/S08 missing/malformed/ambiguous invitation never falls back to public signup', () => {
  for (const search of [
    {},
    {__clerk_ticket: ''},
    {__clerk_ticket: ' token'},
    {__clerk_ticket: ['one', 'two']},
    {__clerk_status: 'sign_up'},
    {__clerk_ticket: 'x'.repeat(8193)},
    {__clerk_ticket: 'ok', __clerk_status: 'other'},
  ]) {
    assert.equal(resolveEntry(search, true).kind, 'invalid');
  }
  assert.equal(resolveEntry({__clerk_ticket: ''}).kind, 'invalid');
  assert.equal(resolveEntry({}).kind, 'public');
});
void test('WEA-10 S02/S07 verified active identity is allowed; unverified or signed-out is denied', async () => {
  assert.equal(
    (
      await readAccess({
        read: async () => ({userId: 'user', verified: true, organizationId: 'org'}),
      })
    ).status,
    'authenticated',
  );
  assert.equal(
    (await readAccess({read: async () => ({userId: 'user', verified: false})})).status,
    'unverified',
  );
  assert.equal(
    (await readAccess({read: async () => ({userId: null, verified: true})})).status,
    'anonymous',
  );
});
void test('WEA-10 S07 unresolved auth exposes no protected result before the provider resolves', async () => {
  let resolve: (value: {
    userId: string;
    verified: boolean;
    organizationId: string;
  }) => void = () => {};
  const pending = new Promise<{userId: string; verified: boolean; organizationId: string}>(
    (done) => {
      resolve = done;
    },
  );
  let returned = false;
  const result = readAccess({read: () => pending}).then((access) => {
    returned = true;
    return access;
  });
  await Promise.resolve();
  assert.equal(returned, false);
  resolve({userId: 'restored', verified: true, organizationId: 'org'});
  assert.equal((await result).status, 'authenticated');
});
void test('WEA-10 S07/S08 provider/network session failure denies access safely', async () => {
  const result = await readAccess({
    read: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(result.status, 'unavailable');
});
