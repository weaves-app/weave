import './dom';

import assert from 'node:assert/strict';
import {afterEach, test} from 'node:test';
import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';

import {OrganizationView} from '../src/features/organizations/presentation/organization-view';
import {createOrganizationFlow} from '../src/features/organizations/application/flow';
import type {OrganizationGateway} from '../src/features/organizations/application/contracts';

import {EMPTY_TEXT} from './test-constants';

afterEach(cleanup);

const gateway: OrganizationGateway = {
  list: async () => [
    {id: 'a', name: 'Atelier', role: 'Member'},
    {id: 'b', name: 'Loom', role: 'Admin', invitationId: 'invite'},
  ],

  accept: async () => {},

  activate: async () => {},

  create: async (name) => ({id: 'new', name, role: 'Admin'}),
};

void test('WEA-10 S13 approved picker lists memberships and invitation in one fieldset and opens selected workspace', async () => {
  let completed = false;
  const flow = createOrganizationFlow(gateway, () => {
    completed = true;
  });

  await flow.load();

  const view = render(
    <OrganizationView
      flow={flow}
      mode="choose"
      email="alex@studio.example"
      signOut={async () => {}}
      signedOut={() => {}}
    />,
  );

  assert.ok(view.getByRole('group', {name: 'Your organizations 2'}));
  assert.ok(view.getByRole('link', {name: 'Create an organization'}));
  fireEvent.click(view.getByRole('radio', {name: /Loom/}));
  assert.ok(view.getByText(/Invitation pending/));
  fireEvent.click(view.getByRole('button', {name: 'Open workspace'}));
  await waitFor(() => assert.equal(completed, true));
});

void test('WEA-10 S14 empty picker offers create; create form has required labelled input and retryable errors', async () => {
  const flow = createOrganizationFlow(
    {
      ...gateway,

      list: async () => [],
    },
    () => {},
  );

  await flow.load();

  const empty = render(
    <OrganizationView
      flow={flow}
      mode="choose"
      email="alex@studio.example"
      signOut={async () => {}}
      signedOut={() => {}}
    />,
  );

  assert.ok(empty.getByText('No organizations yet'));
  empty.unmount();

  const createFlow = createOrganizationFlow(
    {
      ...gateway,

      create: async () => {
        throw Error('offline');
      },
    },
    () => {},
  );
  const view = render(
    <OrganizationView
      flow={createFlow}
      mode="create"
      email="alex@studio.example"
      signOut={async () => {}}
      signedOut={() => {}}
    />,
  );
  const input = view.getByLabelText('Organization name');

  assert.equal(input.hasAttribute('required'), true);
  fireEvent.change(input, {target: {value: 'New Studio'}});
  fireEvent.submit(
    view.getByRole('button', {name: 'Create organization'}).closest('form') ?? assert.fail(),
  );
  await waitFor(() => assert.match(view.getByRole('alert').textContent ?? EMPTY_TEXT, /retry/i));
  assert.equal(
    view.getByRole('button', {name: 'Create organization'}).hasAttribute('disabled'),
    false,
  );
});
