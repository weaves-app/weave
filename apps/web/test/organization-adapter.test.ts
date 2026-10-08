import assert from 'node:assert/strict';
import {test} from 'node:test';

import {createClerkOrganizationGateway} from '../src/features/organizations/infrastructure/clerk-organizations';
import type {OrganizationPort} from '../src/features/organizations/infrastructure/clerk-organizations';

void test('WEA-10 S13 adapter loads every page, merges invitations and prefers existing membership', async () => {
  const calls: string[] = [];
  const port: OrganizationPort = {
    memberships: async (offset) => ({
      data: [{id: 'org-' + offset, name: 'Studio ' + offset, role: 'Member'}],
      totalCount: 2,
    }),

    invitations: async () => ({
      data: [
        {
          id: 'org-0',
          name: 'Studio 0',
          role: 'Admin',
          invitationId: 'duplicate',

          accept: async () => {},
        },
        {
          id: 'invited',
          name: 'Loom',
          role: 'Member',
          invitationId: 'invite',

          accept: async () => {
            calls.push('accept');
          },
        },
      ],
      totalCount: 2,
    }),

    create: async (name) => ({id: 'created', name, role: 'Admin'}),

    activate: async (id) => {
      calls.push(id);
    },
  };
  const gateway = createClerkOrganizationGateway(port);
  const list = await gateway.list();

  assert.equal(list.length, 3);
  assert.equal(list[0]?.invitationId, undefined);
  assert.equal(list[1]?.id, 'org-1');
  await gateway.accept('invite');
  await gateway.activate('invited');
  assert.deepEqual(calls, ['accept', 'invited']);
  await assert.rejects(() => gateway.accept('arbitrary'));
});
