import assert from 'node:assert/strict';
import {test} from 'node:test';

import {createOrganizationFlow} from '../src/features/organizations/application/flow';
import type {OrganizationGateway} from '../src/features/organizations/application/contracts';

function fixture() {
  const calls: string[] = [];
  let complete = 0;
  const gateway: OrganizationGateway = {
    list: async () => [
      {id: 'org-a', name: 'Atelier', role: 'Member'},
      {id: 'org-b', name: 'Loom', role: 'Admin', invitationId: 'invite-b'},
    ],

    accept: async (id) => {
      calls.push('accept:' + id);
    },

    create: async (name) => {
      calls.push('create:' + name);

      return {id: 'new', name, role: 'Admin'};
    },

    activate: async (id) => {
      calls.push('activate:' + id);
    },
  };

  return {
    gateway,
    calls,
    flow: createOrganizationFlow(gateway, () => {
      complete++;
    }),

    completed: () => complete,
  };
}

void test('WEA-10 S13 one list opens membership and accepts pending invitation before activation', async () => {
  const f = fixture();

  await f.flow.load();
  assert.equal(f.flow.getSnapshot().organizations.length, 2);
  f.flow.select('org-a');
  await f.flow.open();
  assert.deepEqual(f.calls, ['activate:org-a']);
  f.flow.select('org-b');
  await f.flow.open();
  assert.deepEqual(f.calls, ['activate:org-a', 'accept:invite-b', 'activate:org-b']);
  assert.equal(f.completed(), 2);
});

void test('WEA-10 S14 list failure recovers, empty list remains usable', async () => {
  const f = fixture();

  f.gateway.list = async () => {
    throw Error('offline');
  };
  await f.flow.load();
  assert.match(f.flow.getSnapshot().error ?? '', /load/i);
  assert.equal(f.flow.getSnapshot().loading, false);
  f.gateway.list = async () => [];
  await f.flow.load();
  assert.equal(f.flow.getSnapshot().error, null);
  assert.deepEqual(f.flow.getSnapshot().organizations, []);
});

void test('WEA-10 S14 blank name is rejected; activation retry reuses created organization', async () => {
  const f = fixture();

  await f.flow.create('  ');
  assert.equal(f.calls.length, 0);
  assert.match(f.flow.getSnapshot().error ?? '', /name/i);
  f.gateway.activate = async () => {
    throw Error('offline');
  };
  await f.flow.create('  New Studio  ');
  assert.deepEqual(f.calls, ['create:New Studio']);
  assert.equal(f.completed(), 0);
  assert.equal(f.flow.getSnapshot().created?.id, 'new');
  f.gateway.activate = async (id) => {
    f.calls.push('activate:' + id);
  };
  await f.flow.create('New Studio');
  assert.deepEqual(f.calls, ['create:New Studio', 'activate:new']);
  assert.equal(f.completed(), 1);
});

void test('WEA-10 S14 acceptance failure denies Home; accepted invitation is not accepted twice after activation failure', async () => {
  const f = fixture();

  await f.flow.load();
  f.flow.select('org-b');
  f.gateway.accept = async () => {
    throw Error('revoked');
  };
  await f.flow.open();
  assert.equal(f.completed(), 0);
  assert.match(f.flow.getSnapshot().error ?? '', /open/i);
  f.gateway.accept = async (id) => {
    f.calls.push('accept:' + id);
  };
  f.gateway.activate = async () => {
    throw Error('offline');
  };
  await f.flow.open();
  f.gateway.activate = async (id) => {
    f.calls.push('activate:' + id);
  };
  await f.flow.open();
  assert.deepEqual(f.calls, ['accept:invite-b', 'activate:org-b']);
  assert.equal(f.completed(), 1);
});

void test('WEA-10 S15 duplicate mutation starts once and cancellation blocks late navigation', async () => {
  const f = fixture();

  let resolve = () => {};

  f.gateway.create = async (name) => {
    f.calls.push('create:' + name);
    await new Promise<void>((done) => {
      resolve = done;
    });

    return {id: 'new', name, role: 'Admin'};
  };

  const first = f.flow.create('Studio');

  await f.flow.create('Studio');
  assert.deepEqual(f.calls, ['create:Studio']);
  f.flow.cancel();
  resolve();
  await first;
  assert.equal(f.completed(), 0);
  assert.deepEqual(f.calls, ['create:Studio']);
});

void test('WEA-10 S14 a stalled list request times out and allows retry without a late stale result', async () => {
  const f = fixture();

  let resolve: (value: readonly {id: string; name: string; role: string}[]) => void = () => {};

  f.gateway.list = () =>
    new Promise((done) => {
      resolve = done;
    });

  const flow = createOrganizationFlow(f.gateway, () => {}, 5);

  void flow.load();
  await new Promise((done) => setTimeout(done, 20));
  assert.equal(flow.getSnapshot().loading, false);
  assert.match(flow.getSnapshot().error ?? '', /retry/i);
  f.gateway.list = async () => [];
  await flow.load();
  resolve([{id: 'stale', name: 'Stale', role: 'Member'}]);
  await Promise.resolve();
  assert.deepEqual(flow.getSnapshot().organizations, []);
});
