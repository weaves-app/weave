'use client';

import {useAuth, useClerk} from '@clerk/nextjs';
import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

import {createClerkOrganizationGateway} from '../infrastructure/clerk-organizations';
import {createOrganizationFlow} from '../application/flow';
import {OrganizationView} from './organization-view';
import {AuthShell} from '../../auth/presentation/auth-shell';
import {SignOutControl} from '../../auth/presentation/home-view';
import {pendingTaskMessage} from '../../auth/application/session-task';

import {SESSION_TASK} from '../../auth/application/auth-constants';

export const EMPTY_EMAIL_ADDRESS = '';

export const CLERK_ACTIVE_STATUS = 'active';

export const CLERK_VERIFIED_STATUS = 'verified';

export const CHOOSE_ORGANIZATION_MODE = 'choose';

export interface ClerkOrganizationsProps {
  readonly mode: 'choose' | 'create';
}

export function ClerkOrganizations({mode}: ClerkOrganizationsProps): React.JSX.Element {
  const auth = useAuth({treatPendingAsSignedOut: false});
  const clerk = useClerk();
  const router = useRouter();
  const [flow] = useState(() =>
    createOrganizationFlow(
      createClerkOrganizationGateway({
        memberships: async (offset) => {
          if (!clerk.user) throw new Error('No authenticated user');

          const page = await clerk.user.getOrganizationMemberships({
            initialPage: Math.floor(offset / 50) + 1,
            pageSize: 50,
          });

          return {
            totalCount: page.total_count,
            data: page.data.map((membership) => ({
              id: membership.organization.id,
              name: membership.organization.name,
              role: membership.role,
            })),
          };
        },

        invitations: async (offset) => {
          if (!clerk.user) throw new Error('No authenticated user');

          const page = await clerk.user.getOrganizationInvitations({
            initialPage: Math.floor(offset / 50) + 1,
            pageSize: 50,
            status: 'pending',
          });

          return {
            totalCount: page.total_count,
            data: page.data.map((invitation) => ({
              id: invitation.publicOrganizationData.id,
              name: invitation.publicOrganizationData.name,
              role: invitation.role,
              invitationId: invitation.id,

              accept: async () => {
                await invitation.accept();
              },
            })),
          };
        },

        create: async (name) => {
          const organization = await clerk.createOrganization({name});

          return {id: organization.id, name: organization.name, role: 'org:admin'};
        },

        activate: async (id) => {
          let ready = false;

          await clerk.setActive({
            organization: id,

            navigate: ({session}) => {
              ready =
                session?.status === CLERK_ACTIVE_STATUS &&
                !session.currentTask &&
                session.lastActiveOrganizationId === id;
            },
          });

          if (!ready) throw new Error('Organization activation incomplete');
        },
      }),
      () => {
        router.replace('/');
        router.refresh();
      },
    ),
  );
  const loaded = auth.isLoaded && clerk.loaded;
  const task = clerk.session?.currentTask?.key;
  const eligible =
    loaded &&
    auth.isSignedIn === true &&
    (!task || task === SESSION_TASK.CHOOSE_ORGANIZATION) &&
    clerk.user?.primaryEmailAddress?.verification.status === CLERK_VERIFIED_STATUS;

  useEffect(() => {
    if (!loaded) return;

    if (!auth.isSignedIn) {
      flow.cancel();
      router.replace('/sign-in');

      return;
    }

    if (eligible && mode === CHOOSE_ORGANIZATION_MODE) void flow.load();
  }, [flow, loaded, auth.isSignedIn, eligible, mode, router]);
  useEffect(() => () => flow.cancel(), [flow]);

  if (!loaded)
    return (
      <AuthShell>
        <p role="status">Loading organizations…</p>
      </AuthShell>
    );

  if (!auth.isSignedIn)
    return (
      <AuthShell>
        <p role="status">Returning to sign in…</p>
      </AuthShell>
    );

  if (!eligible)
    return (
      <AuthShell>
        <h2>Account setup required</h2>
        <p role="alert">
          {task
            ? pendingTaskMessage(task)
            : 'Finish email verification before choosing an organization.'}
        </p>
        <SignOutControl
          signOut={() => clerk.signOut()}
          signedOut={() => {
            router.replace('/sign-in');
            router.refresh();
          }}
        />
      </AuthShell>
    );

  return (
    <OrganizationView
      flow={flow}
      mode={mode}
      email={clerk.user?.primaryEmailAddress?.emailAddress ?? EMPTY_EMAIL_ADDRESS}
      signOut={() => clerk.signOut()}
      signedOut={() => {
        router.replace('/sign-in');
        router.refresh();
      }}
    />
  );
}
