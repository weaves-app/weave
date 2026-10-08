import type {OrganizationFlow, OrganizationGateway, OrganizationSnapshot} from './contracts';

export function createOrganizationFlow(
  gateway: OrganizationGateway,
  complete: () => void,
  timeoutMilliseconds = 30000,
): OrganizationFlow {
  let state: OrganizationSnapshot = {
    organizations: [],
    selectedId: null,
    loading: false,
    pending: false,
    error: null,
    created: null,
  };
  const listeners = new Set<() => void>();
  const accepted = new Set<string>();
  let revision = 0;

  const update = (change: Partial<OrganizationSnapshot>): void => {
    state = {...state, ...change};
    listeners.forEach((listener) => listener());
  };

  const run = async (
    operation: (current: () => boolean) => Promise<void>,
    message: string,
  ): Promise<void> => {
    if (state.pending || state.loading) return;

    const version = ++revision;

    update({pending: true, error: null});

    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      await Promise.race([
        operation(() => version === revision),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('timeout')), timeoutMilliseconds);
        }),
      ]);
    } catch {
      if (version === revision) update({error: message});
    } finally {
      if (timer) clearTimeout(timer);

      if (version === revision) {
        revision++;
        update({pending: false});
      }
    }
  };

  return {
    getSnapshot: () => state,

    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },

    load: async () => {
      if (state.pending) return;

      const version = ++revision;

      update({loading: true, error: null});

      let timer: ReturnType<typeof setTimeout> | undefined;

      try {
        const organizations = await Promise.race([
          gateway.list(),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error('timeout')), timeoutMilliseconds);
          }),
        ]);

        if (version !== revision) return;

        update({
          organizations,
          selectedId: organizations.some((org) => org.id === state.selectedId)
            ? state.selectedId
            : (organizations[0]?.id ?? null),
        });
      } catch {
        if (version === revision) update({error: 'Unable to load organizations. Please retry.'});
      } finally {
        if (timer) clearTimeout(timer);

        if (version === revision) {
          revision++;
          update({loading: false});
        }
      }
    },

    select: (id) => {
      if (!state.pending && state.organizations.some((org) => org.id === id))
        update({selectedId: id, error: null});
    },

    open: () =>
      run(async (current) => {
        const org = state.organizations.find((item) => item.id === state.selectedId);

        if (!org) {
          update({error: 'Choose an organization.'});

          return;
        }

        if (org.invitationId && !accepted.has(org.invitationId)) {
          await gateway.accept(org.invitationId);
          accepted.add(org.invitationId);

          if (!current()) return;
        }

        await gateway.activate(org.id);

        if (current()) complete();
      }, 'Unable to open this organization. Please retry or choose another organization.'),

    create: (name) =>
      run(async (current) => {
        const value = name.trim();

        if (!value || value.length > 80) {
          update({error: 'Enter an organization name between 1 and 80 characters.'});

          return;
        }

        const organization = state.created ?? (await gateway.create(value));

        if (!current()) return;

        update({created: organization});
        await gateway.activate(organization.id);

        if (current()) complete();
      }, 'Unable to create or open your organization. Please retry.'),

    cancel: () => {
      revision++;
      update({pending: false, loading: false});
    },
  };
}
