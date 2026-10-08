import type {OrganizationGateway, OrganizationOption} from '../application/contracts';

export interface OrganizationPage {
  readonly data: readonly OrganizationOption[];
  readonly totalCount: number;
}

export interface OrganizationInvitation extends OrganizationOption {
  readonly invitationId: string;
  accept(): Promise<void>;
}

export interface InvitationPage {
  readonly data: readonly OrganizationInvitation[];
  readonly totalCount: number;
}

export interface OrganizationPort {
  memberships(offset: number): Promise<OrganizationPage>;
  invitations(offset: number): Promise<InvitationPage>;
  create(name: string): Promise<OrganizationOption>;
  activate(id: string): Promise<void>;
}

export function createClerkOrganizationGateway(port: OrganizationPort): OrganizationGateway {
  const invitations = new Map<string, OrganizationInvitation>();

  const pages = async <T extends OrganizationOption>(
    read: (offset: number) => Promise<{readonly data: readonly T[]; readonly totalCount: number}>,
  ): Promise<readonly T[]> => {
    const result: T[] = [];
    let total = 1;

    while (result.length < total) {
      const page = await read(result.length);

      if (
        !Number.isInteger(page.totalCount) ||
        page.totalCount < 0 ||
        (!page.data.length && result.length < page.totalCount)
      )
        throw new Error('Invalid organization response');

      result.push(...page.data);
      total = page.totalCount;
    }

    return result;
  };

  return {
    list: async () => {
      const [memberships, pending] = await Promise.all([
        pages(port.memberships),
        pages(port.invitations),
      ]);

      invitations.clear();
      pending.forEach((invitation) => invitations.set(invitation.invitationId, invitation));

      const merged = new Map(memberships.map((org) => [org.id, org]));

      pending.forEach((org) => {
        if (!merged.has(org.id))
          merged.set(org.id, {
            id: org.id,
            name: org.name,
            role: org.role,
            invitationId: org.invitationId,
          });
      });

      return [...merged.values()];
    },

    accept: async (id) => {
      const invitation = invitations.get(id);

      if (!invitation) throw new Error('Invitation is no longer available');

      await invitation.accept();
    },

    create: (name) => port.create(name),

    activate: (id) => port.activate(id),
  };
}
