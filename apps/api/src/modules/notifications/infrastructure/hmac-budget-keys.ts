import {createHmac} from 'node:crypto';

import type {AccountBudgetKeys, BUDGET_OPERATION} from '../application/notification-ports';

export class HmacBudgetKeys implements AccountBudgetKeys {
  constructor(
    private readonly appId: string,
    private readonly secret: string,
  ) {}

  account(
    accountId: string,
    operation: (typeof BUDGET_OPERATION)[keyof typeof BUDGET_OPERATION],
  ): string {
    const digest = createHmac('sha256', this.secret)
      .update(JSON.stringify([this.appId, accountId]))
      .digest('hex');

    return `app:${this.appId}:account:${digest}:${operation}`;
  }
}
