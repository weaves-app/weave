import type {AuthenticatedSession} from '../../authentication/contracts';
import type {
  ProviderReadinessReader,
  ReadinessQuery,
  RequestBudget,
  AccountBudgetKeys,
  Clock,
  ReadinessResult,
  ReadinessVerifier,
} from './notification-ports';
import {BUDGET_OPERATION} from './notification-ports';

export const READINESS = {
  INTERVAL_MS: 1000,
  VALID_SECONDS: 60,
  NO_VALIDITY: 0,
  READY: 'ready',
  PENDING: 'pending',
} as const;

export class VerifyReadiness implements ReadinessVerifier {
  private readonly inFlight = new Map<string, Promise<ReadinessResult>>();

  constructor(
    private readonly reader: ProviderReadinessReader,
    private readonly budget: RequestBudget,
    private readonly keys: AccountBudgetKeys,
    private readonly clock: Clock,
  ) {}

  async execute(session: AuthenticatedSession, query: ReadinessQuery): Promise<ReadinessResult> {
    const key = JSON.stringify([
      session.accountId,
      session.sessionId,
      session.tokenExpiresAtSeconds,
      query.subscriptionId,
      query.platform,
    ]);
    const previous = this.inFlight.get(key);

    if (previous) return previous;

    const operation = this.check(session, query);

    this.inFlight.set(key, operation);

    try {
      return await operation;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async check(
    session: AuthenticatedSession,
    query: ReadinessQuery,
  ): Promise<ReadinessResult> {
    await this.budget.reserve(
      this.keys.account(session.accountId, BUDGET_OPERATION.READINESS),
      READINESS.INTERVAL_MS,
      true,
    );

    const ready = await this.reader.read(session, query);

    return {
      status: ready ? READINESS.READY : READINESS.PENDING,
      checkedAt: new Date(this.clock.now()).toISOString(),
      validForSeconds: ready ? READINESS.VALID_SECONDS : READINESS.NO_VALIDITY,
    };
  }
}
