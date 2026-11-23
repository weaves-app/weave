import {Pool} from 'pg';

import {PostgresRequestBudget} from '../modules/notifications/infrastructure/postgres-request-budget';

export const MAINTENANCE = {FAILURE: 1, TIMEOUT_MS: 5000} as const;

async function cleanup(): Promise<void> {
  const appId = process.env.ONESIGNAL_APP_ID;
  const connectionString = process.env.DATABASE_URL;

  if (
    !appId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(appId) ||
    !connectionString
  )
    throw new Error('Notification budget cleanup unavailable');

  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: MAINTENANCE.TIMEOUT_MS,
    query_timeout: MAINTENANCE.TIMEOUT_MS,
  });

  try {
    console.log(
      JSON.stringify({deleted: await new PostgresRequestBudget(pool, `app:${appId}`).cleanup()}),
    );
  } finally {
    await pool.end();
  }
}

void cleanup().catch(() => {
  console.error('Notification budget cleanup unavailable');
  process.exitCode = MAINTENANCE.FAILURE;
});
