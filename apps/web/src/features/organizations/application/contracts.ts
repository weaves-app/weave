export interface OrganizationOption {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly invitationId?: string;
}
export interface OrganizationGateway {
  list(): Promise<readonly OrganizationOption[]>;
  accept(invitationId: string): Promise<void>;
  create(name: string): Promise<OrganizationOption>;
  activate(organizationId: string): Promise<void>;
}
export interface OrganizationSnapshot {
  readonly organizations: readonly OrganizationOption[];
  readonly selectedId: string | null;
  readonly loading: boolean;
  readonly pending: boolean;
  readonly error: string | null;
  readonly created: OrganizationOption | null;
}
export interface OrganizationFlow {
  getSnapshot(): OrganizationSnapshot;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  select(id: string): void;
  open(): Promise<void>;
  create(name: string): Promise<void>;
  cancel(): void;
}
