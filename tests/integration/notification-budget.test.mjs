import assert from 'node:assert/strict';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import pg from 'pg';
import {tsImport} from 'tsx/esm/api';

export const BUDGET_TEST = {
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
  RETRY: 'retry_later',
  MAX_RETRY: 60,
};

const {PostgresRequestBudget} = await tsImport(
  '../../apps/api/src/modules/notifications/infrastructure/postgres-request-budget.ts',
  import.meta.url,
);

void test('S11 PostgreSQL distributed notification budget and bounded cleanup', async (t) => {
  const database = process.env.DATABASE_URL;

  assert.ok(database, 'Explicit local fixture DATABASE_URL required');

  const first = new pg.Pool({connectionString: database});
  const second = new pg.Pool({connectionString: database});
  const scope = `test:${randomUUID()}`;
  const a = new PostgresRequestBudget(first, scope);
  const b = new PostgresRequestBudget(second, scope);

  t.after(async () => {
    await first.query('DELETE FROM "NotificationRequestBudget" WHERE starts_with(key,$1)', [scope]);
    await Promise.all([first.end(), second.end()]);
  });
  await first.query('SELECT 1');
  await t.test('two clients admit exactly one claimant and no resumed burst', async () => {
    const key = `${scope}:provider`;
    const result = await Promise.allSettled([
      a.reserve(key, 1000, false),
      b.reserve(key, 1000, false),
    ]);

    assert.equal(result.filter((r) => r.status === BUDGET_TEST.FULFILLED).length, 1);
    assert.equal(
      result.filter((r) => r.status === BUDGET_TEST.REJECTED && r.reason.code === BUDGET_TEST.RETRY)
        .length,
      1,
    );
    await first.query(
      'UPDATE "NotificationRequestBudget" SET "nextAllowedAt"=clock_timestamp()-interval \'1 hour\' WHERE key=$1',
      [key],
    );
    await a.reserve(key, 1000, false);
    await assert.rejects(b.reserve(key, 1000, false), {code: 'retry_later'});

    const {rows} = await first.query(
      'SELECT "expiresAt", "nextAllowedAt">clock_timestamp() AS future FROM "NotificationRequestBudget" WHERE key=$1',
      [key],
    );

    assert.equal(rows[0].expiresAt, null);
    assert.equal(rows[0].future, true);
  });
  await t.test(
    'account 5 second grant cooldown persists and rejected attempts do not extend retention',
    async () => {
      const key = `${scope}:account:grant`;

      await a.reserve(key, 5000, true);

      const before = (
        await first.query('SELECT * FROM "NotificationRequestBudget" WHERE key=$1', [key])
      ).rows[0];

      assert.equal(before.expiresAt - before.nextAllowedAt, 86400000);
      await assert.rejects(b.reserve(key, 5000, true), {code: 'retry_later'});

      const after = (
        await first.query('SELECT * FROM "NotificationRequestBudget" WHERE key=$1', [key])
      ).rows[0];

      assert.equal(+after.expiresAt, +before.expiresAt);
      await b.defer(key, 120000, true);

      const deferred = (
        await first.query('SELECT * FROM "NotificationRequestBudget" WHERE key=$1', [key])
      ).rows[0];

      assert.ok(deferred.nextAllowedAt > before.nextAllowedAt);
      assert.equal(deferred.expiresAt - deferred.nextAllowedAt, 86400000);
      await assert.rejects(
        a.reserve(key, 1000, true),
        (error) =>
          error.code === BUDGET_TEST.RETRY && error.retryAfterSeconds === BUDGET_TEST.MAX_RETRY,
      );
    },
  );
  await t.test(
    'one sweep deletes at most 100 expired rows, retains global/cooldown, and runs once per minute across replicas',
    async () => {
      await first.query('DELETE FROM "NotificationRequestBudget" WHERE key=$1', [
        `${scope}:cleanup`,
      ]);
      await first.query(
        'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") SELECT $1||g,clock_timestamp()-interval \'25 hours\',clock_timestamp()-interval \'1 hour\' FROM generate_series(1,150) g',
        [`${scope}:expired:`],
      );

      const counts = await Promise.all([a.cleanup(), b.cleanup()]);

      assert.equal(
        counts.reduce((x, y) => x + y, 0),
        100,
      );
      assert.equal(
        (
          await first.query(
            'SELECT count(*)::int AS n FROM "NotificationRequestBudget" WHERE starts_with(key,$1)',
            [`${scope}:expired:`],
          )
        ).rows[0].n,
        50,
      );
      assert.equal(await a.cleanup(), 0);
      assert.equal(
        (
          await first.query(
            'SELECT count(*)::int AS n FROM "NotificationRequestBudget" WHERE key=$1',
            [`${scope}:provider`],
          )
        ).rows[0].n,
        1,
      );
    },
  );
  await t.test('concurrent reservation blocks deletion of refreshed expired row', async () => {
    const key = `${scope}:refresh`;

    await first.query('DELETE FROM "NotificationRequestBudget" WHERE key=$1', [`${scope}:cleanup`]);
    await first.query('DELETE FROM "NotificationRequestBudget" WHERE starts_with(key,$1)', [
      `${scope}:expired:`,
    ]);
    await first.query(
      'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") VALUES($1,clock_timestamp()-interval \'25 hours\',clock_timestamp()-interval \'1 hour\')',
      [key],
    );
    await Promise.all([a.reserve(key, 5000, true), b.cleanup()]);
    assert.equal(
      (
        await first.query(
          'SELECT count(*)::int AS n FROM "NotificationRequestBudget" WHERE key=$1 AND "nextAllowedAt">clock_timestamp()',
          [key],
        )
      ).rows[0].n,
      1,
    );
  });
  await t.test(
    'failed sweep retains distributed cooldown and cannot reverse a successful account reservation',
    async () => {
      const failureScope = `${scope}:failure`;
      const failing = new PostgresRequestBudget(first, failureScope);
      const triggerName = `wea29_${randomUUID().replaceAll('-', '')}`;

      await first.query(
        `CREATE FUNCTION ${triggerName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF starts_with(OLD.key,TG_ARGV[0]) THEN RAISE EXCEPTION 'synthetic cleanup failure'; END IF; RETURN OLD; END $$`,
      );
      await first.query(
        `CREATE TRIGGER ${triggerName} BEFORE DELETE ON "NotificationRequestBudget" FOR EACH ROW EXECUTE FUNCTION ${triggerName}('${failureScope}')`,
      );

      try {
        await first.query(
          'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") VALUES($1,clock_timestamp()-interval \'25 hours\',clock_timestamp()-interval \'1 hour\')',
          [`${failureScope}:expired`],
        );
        await failing.reserve(`${failureScope}:account`, 5000, true);

        const lease = await first.query(
          'SELECT count(*)::int AS n FROM "NotificationRequestBudget" WHERE key=$1 AND "nextAllowedAt">clock_timestamp()',
          [`${failureScope}:cleanup`],
        );

        assert.equal(lease.rows[0].n, 1);
        assert.equal(await new PostgresRequestBudget(second, failureScope).cleanup(), 0);
      } finally {
        await first.query(`DROP TRIGGER ${triggerName} ON "NotificationRequestBudget"`);
        await first.query(`DROP FUNCTION ${triggerName}()`);
      }
    },
  );
  await t.test(
    'maintenance command performs one bounded batch, reports only aggregate and exits',
    async () => {
      const app = randomUUID();
      const prefix = `app:${app}`;

      try {
        await first.query(
          'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") SELECT $1||g,clock_timestamp()-interval \'25 hours\',clock_timestamp()-interval \'1 hour\' FROM generate_series(1,150) g',
          [`${prefix}:expired:`],
        );

        const run = () =>
          promisify(execFile)(
            process.execPath,
            ['--import', 'tsx', 'apps/api/src/scripts/cleanup-notification-budgets.ts'],
            {env: {...process.env, ONESIGNAL_APP_ID: app}, timeout: 5000},
          );

        assert.deepEqual(JSON.parse((await run()).stdout), {deleted: 100});
        assert.deepEqual(JSON.parse((await run()).stdout), {deleted: 0});
        assert.equal(
          (
            await first.query(
              'SELECT count(*)::int AS n FROM "NotificationRequestBudget" WHERE starts_with(key,$1)',
              [`${prefix}:expired:`],
            )
          ).rows[0].n,
          50,
        );
      } finally {
        await first.query('DELETE FROM "NotificationRequestBudget" WHERE starts_with(key,$1)', [
          prefix,
        ]);
      }
    },
  );
  await t.test(
    'database rejects expiring-before-cooldown and non-expiring account rows',
    async () => {
      await assert.rejects(
        first.query(
          'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") VALUES ($1,clock_timestamp()+interval \'1 hour\',clock_timestamp())',
          [`${scope}:invalid-expiry`],
        ),
      );
      await assert.rejects(
        first.query(
          'INSERT INTO "NotificationRequestBudget" (key,"nextAllowedAt","expiresAt") VALUES ($1,clock_timestamp(),NULL)',
          [`${scope}:account:invalid`],
        ),
      );
    },
  );
  await t.test('storage outage fails closed', async () => {
    const broken = new PostgresRequestBudget(
      {
        connect: async () => {
          throw new Error('database secret');
        },
      },
      scope,
    );

    await assert.rejects(broken.reserve('key', 1000, false), {
      code: 'notifications_unavailable',
      message: 'notifications_unavailable',
    });
  });
});
