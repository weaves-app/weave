import type {AuthenticatedSession} from '../../authentication/contracts';
import type {
  IdentityGrant,
  IdentityGrantIssuer,
  IdentityGrantSigner,
  RequestBudget,
  AccountBudgetKeys,
} from './notification-ports';
import {BUDGET_OPERATION} from './notification-ports';

export const GRANT_INTERVAL_MS = 5000;

export class IssueIdentityGrant implements IdentityGrantIssuer {
  constructor(
    private readonly signer: IdentityGrantSigner,
    private readonly budget: RequestBudget,
    private readonly keys: AccountBudgetKeys,
  ) {}

  async execute(session: AuthenticatedSession): Promise<IdentityGrant> {
    await this.budget.reserve(
      this.keys.account(session.accountId, BUDGET_OPERATION.GRANT),
      GRANT_INTERVAL_MS,
      true,
    );

    return this.signer.sign(session);
  }
}
