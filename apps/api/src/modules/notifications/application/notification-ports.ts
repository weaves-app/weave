import type {AuthenticatedSession} from '../../authentication/contracts';

export interface Clock {
  now(): number;
}

export interface IdentityGrant {
  readonly externalId: string;
  readonly token: string;
  readonly expiresAt: string;
}

export interface IdentityGrantSigner {
  sign(session: AuthenticatedSession): Promise<IdentityGrant>;
}

export const PUSH_PLATFORM = {ANDROID: 'android', IOS: 'ios'} as const;

export type PushPlatform = (typeof PUSH_PLATFORM)[keyof typeof PUSH_PLATFORM];

export interface ReadinessQuery {
  readonly subscriptionId: string;
  readonly platform: PushPlatform;
}

export interface ProviderReadinessReader {
  read(session: AuthenticatedSession, query: ReadinessQuery): Promise<boolean>;
}

export interface RequestBudget {
  reserve(key: string, intervalMs: number, accountScoped: boolean): Promise<void>;
  defer(key: string, delayMs: number, accountScoped: boolean): Promise<void>;
  cleanup(): Promise<number>;
}

export const BUDGET_OPERATION = {GRANT: 'grant', READINESS: 'readiness'} as const;

export interface AccountBudgetKeys {
  account(
    accountId: string,
    operation: (typeof BUDGET_OPERATION)[keyof typeof BUDGET_OPERATION],
  ): string;
}

export interface IdentityGrantIssuer {
  execute(session: AuthenticatedSession): Promise<IdentityGrant>;
}

export interface ReadinessResult {
  readonly status: 'ready' | 'pending';
  readonly checkedAt: string;
  readonly validForSeconds: number;
}

export interface ReadinessVerifier {
  execute(session: AuthenticatedSession, query: ReadinessQuery): Promise<ReadinessResult>;
}

export interface NotificationServices {
  readonly issuer: IdentityGrantIssuer;
  readonly verifier: ReadinessVerifier;
}
