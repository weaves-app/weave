import type {RequestBudget} from '../application/notification-ports';
import {NotificationFailure, NOTIFICATION_ERROR} from '../application/notification-failure';

export interface BudgetConnection {
  query(
    sql: string,
    values?: unknown[],
  ): Promise<{rows: Record<string, unknown>[]; rowCount: number | null}>;
  release(): void;
}

export interface BudgetDatabase {
  connect(): Promise<BudgetConnection>;
}

export const BUDGET_POLICY = {
  ZERO: 0,
  MIN_RETRY: 1,
  MAX_RETRY: 60,
  CLEANUP_INTERVAL: 60000,
} as const;

export class PostgresRequestBudget implements RequestBudget {
  constructor(
    private readonly database: BudgetDatabase,
    private readonly scope: string,
  ) {}

  private async transaction<T>(work: (connection: BudgetConnection) => Promise<T>): Promise<T> {
    let connection: BudgetConnection | undefined;

    try {
      connection = await this.database.connect();
      await connection.query('BEGIN');
      await connection.query("SET LOCAL lock_timeout='2s'");

      const result = await work(connection);

      await connection.query('COMMIT');

      return result;
    } catch (error) {
      if (connection) await connection.query('ROLLBACK').catch(() => undefined);

      if (error instanceof NotificationFailure) throw error;

      throw new NotificationFailure({code: NOTIFICATION_ERROR.UNAVAILABLE});
    } finally {
      connection?.release();
    }
  }

  private async claim(
    connection: BudgetConnection,
    key: string,
    intervalMs: number,
    accountScoped: boolean,
    extend: boolean,
  ): Promise<void> {
    await connection.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [key]);

    const result = await connection.query(
      `WITH timing AS MATERIALIZED (SELECT clock_timestamp()+($2::double precision * interval '1 millisecond') AS next)
      INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt")
      SELECT $1,next,CASE WHEN $3 THEN next+interval '24 hours' ELSE NULL END FROM timing
      ON CONFLICT (key) DO UPDATE SET
        "nextAllowedAt"=CASE WHEN $4 THEN GREATEST("NotificationRequestBudget"."nextAllowedAt",EXCLUDED."nextAllowedAt") ELSE EXCLUDED."nextAllowedAt" END,
        "expiresAt"=CASE WHEN $3 THEN (CASE WHEN $4 THEN GREATEST("NotificationRequestBudget"."nextAllowedAt",EXCLUDED."nextAllowedAt") ELSE EXCLUDED."nextAllowedAt" END)+interval '24 hours' ELSE NULL END
      WHERE $4 OR "NotificationRequestBudget"."nextAllowedAt"<=clock_timestamp()
      RETURNING key`,
      [key, intervalMs, accountScoped, extend],
    );

    if (result.rowCount === BUDGET_POLICY.ZERO) {
      const wait = await connection.query(
        'SELECT ceil(extract(epoch FROM ("nextAllowedAt"-clock_timestamp())))::int AS seconds FROM "NotificationRequestBudget" WHERE key=$1',
        [key],
      );
      const seconds = wait.rows[0]?.seconds;

      throw new NotificationFailure({
        code: NOTIFICATION_ERROR.RETRY,
        retryAfterSeconds: Math.min(
          BUDGET_POLICY.MAX_RETRY,
          Math.max(
            BUDGET_POLICY.MIN_RETRY,
            typeof seconds === 'number' ? seconds : BUDGET_POLICY.MIN_RETRY,
          ),
        ),
      });
    }
  }

  async reserve(key: string, intervalMs: number, accountScoped: boolean): Promise<void> {
    await this.transaction((connection) =>
      this.claim(connection, key, intervalMs, accountScoped, false),
    );

    if (accountScoped)
      await this.cleanup().catch(() => {
        console.warn('Notification budget cleanup unavailable');
      });
  }

  async defer(key: string, delayMs: number, accountScoped: boolean): Promise<void> {
    await this.transaction((connection) =>
      this.claim(connection, key, delayMs, accountScoped, true),
    );
  }

  async cleanup(): Promise<number> {
    try {
      await this.transaction((connection) =>
        this.claim(
          connection,
          `${this.scope}:cleanup`,
          BUDGET_POLICY.CLEANUP_INTERVAL,
          false,
          false,
        ),
      );
    } catch (error) {
      if (error instanceof NotificationFailure && error.code === NOTIFICATION_ERROR.RETRY)
        return BUDGET_POLICY.ZERO;

      throw error;
    }

    return this.transaction(async (connection) => {
      const result = await connection.query(
        `WITH expired AS (SELECT key FROM "NotificationRequestBudget"
          WHERE starts_with(key,$1) AND "expiresAt"<=clock_timestamp() AND "nextAllowedAt"<=clock_timestamp()
          ORDER BY "expiresAt",key LIMIT 100 FOR UPDATE SKIP LOCKED)
          DELETE FROM "NotificationRequestBudget" target USING expired WHERE target.key=expired.key
          AND target."expiresAt"<=clock_timestamp() AND target."nextAllowedAt"<=clock_timestamp()`,
        [`${this.scope}:`],
      );

      return result.rowCount ?? BUDGET_POLICY.ZERO;
    });
  }
}
