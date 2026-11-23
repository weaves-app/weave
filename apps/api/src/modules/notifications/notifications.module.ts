import {Module} from '@nestjs/common';
import {ConfigModule, ConfigService} from '@nestjs/config';
import {Pool} from 'pg';

import {AuthenticationModule} from '../authentication/contracts';
import type {NotificationServices} from './application/notification-ports';
import {NOTIFICATION_SERVICES} from './notifications.tokens';
import {notificationConfig} from './infrastructure/notification-config';
import {PostgresRequestBudget} from './infrastructure/postgres-request-budget';
import type {BudgetDatabase} from './infrastructure/postgres-request-budget';
import {HmacBudgetKeys} from './infrastructure/hmac-budget-keys';
import {JoseIdentityGrantSigner} from './infrastructure/jose-identity-grant-signer';
import {OneSignalReadinessReader} from './infrastructure/onesignal-readiness-reader';
import {IssueIdentityGrant} from './application/issue-identity-grant';
import {VerifyReadiness} from './application/verify-readiness';
import {NotificationsController} from './presentation/notifications.controller';

export const BUDGET_DATABASE = Symbol('BudgetDatabase');

export const POOL_TIMEOUT_MS = 5000;

@Module({
  imports: [ConfigModule, AuthenticationModule],
  controllers: [NotificationsController],
  providers: [
    {
      provide: BUDGET_DATABASE,
      inject: [ConfigService],

      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.get<string>('DATABASE_URL'),
          connectionTimeoutMillis: POOL_TIMEOUT_MS,
          query_timeout: POOL_TIMEOUT_MS,
        });

        return {
          connect: () => pool.connect(),

          onModuleDestroy: () => pool.end(),
        };
      },
    },
    {
      provide: NOTIFICATION_SERVICES,
      inject: [ConfigService, BUDGET_DATABASE],

      useFactory: (config: ConfigService, database: BudgetDatabase): NotificationServices => {
        let services: NotificationServices | undefined;

        function get(): NotificationServices {
          if (services) return services;

          const settings = notificationConfig(config);
          const clock = {now: () => Date.now()};
          const budget = new PostgresRequestBudget(database, `app:${settings.appId}`);
          const keys = new HmacBudgetKeys(settings.appId, settings.budgetSecret);
          const signer = new JoseIdentityGrantSigner(settings, clock);
          const reader = new OneSignalReadinessReader(
            settings.appId,
            signer,
            budget,
            {fetch: (url, init) => fetch(url, init)},
            clock,
          );

          services = {
            issuer: new IssueIdentityGrant(signer, budget, keys),
            verifier: new VerifyReadiness(reader, budget, keys, clock),
          };

          return services;
        }

        return {
          issuer: {execute: (session) => get().issuer.execute(session)},
          verifier: {execute: (session, query) => get().verifier.execute(session, query)},
        };
      },
    },
  ],
})
export class NotificationsModule {}
