import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {createServer} from 'node:net';
import {once} from 'node:events';

export const LOCAL_DATABASE_URL =
  'postgresql://weave:weave_local@localhost:5432/weave?schema=public';

export const MAX_STARTUP_ATTEMPTS = 100;

export const UNIQUE_VIOLATION_CODE = '23505';

async function freePort() {
  const socket = createServer();

  socket.listen(0);
  await once(socket, 'listening');

  const port = socket.address().port;

  await new Promise((resolve) => socket.close(resolve));

  return String(port);
}

const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;

async function server(t, command, args, options, url) {
  const child = spawn(command, args, {...options, stdio: ['ignore', 'pipe', 'pipe']});
  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  t.after(async () => {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await once(child, 'exit');
    }
  });

  for (let attempt = 0; attempt < MAX_STARTUP_ATTEMPTS; attempt++) {
    if (child.exitCode !== null) throw new Error(output);

    try {
      const response = await fetch(url, {signal: AbortSignal.timeout(500)});

      if (response.ok) return;
    } catch {
      /* Retry until startup deadline. */
    }

    await delay(100);
  }

  throw new Error(`Server startup timed out: ${output}`);
}

void test('S06 API liveness/readiness; WEA-10 S02/S03/S08 web denies access without auth configuration', async (t) => {
  const apiPort = await freePort();
  const webPort = await freePort();

  await server(
    t,
    process.execPath,
    ['apps/api/dist/main.js'],
    {env: {...process.env, DATABASE_URL: databaseUrl, PORT: apiPort}},
    `http://localhost:${apiPort}/api/health`,
  );
  assert.deepEqual(await (await fetch(`http://localhost:${apiPort}/api/health`)).json(), {
    status: 'ok',
    service: 'weave-api',
  });

  const ready = await fetch(`http://localhost:${apiPort}/api/health/ready`);

  assert.equal(ready.status, 200);
  assert.equal((await ready.json()).database, 'connected');
  await server(
    t,
    process.execPath,
    [path.resolve('node_modules/next/dist/bin/next'), 'start', '--port', webPort],
    {
      cwd: 'apps/web',
      env: {
        ...process.env,
        API_URL: `http://localhost:${apiPort}`,
        CLERK_PUBLISHABLE_KEY: '',
        CLERK_SECRET_KEY: '',
      },
    },
    `http://localhost:${webPort}`,
  );

  const html = await (await fetch(`http://localhost:${webPort}`)).text();

  assert.match(html, /Authentication unavailable/);
  assert.doesNotMatch(html, /<h1>Home<\/h1>/);

  const protectedResponse = await fetch(`http://localhost:${webPort}/api/session`);

  assert.equal(protectedResponse.status, 503);
  assert.equal(protectedResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await protectedResponse.json(), {authenticated: false});

  for (const route of ['/sign-up', '/sign-in', '/sso-callback']) {
    const response = await fetch(`http://localhost:${webPort}${route}`);

    assert.equal(response.status, 200);

    const authHtml = await response.text();

    assert.match(authHtml, /Authentication unavailable/);
    assert.match(authHtml, /Everything, woven together/);
    assert.match(authHtml, /brand\/logo\.svg/);
    assert.doesNotMatch(authHtml, /Preview screens|Accept invitation/);
  }

  const invitation = await fetch(`http://localhost:${webPort}/invite`, {redirect: 'manual'});

  assert.equal(invitation.status, 404);

  const legacyLink = await fetch(
    `http://localhost:${webPort}/sign-up?__clerk_ticket=opaque-ticket`,
    {redirect: 'manual'},
  );

  assert.equal(legacyLink.status, 200);
});

void test('S06 database outage returns 503 readiness and 200 liveness', async (t) => {
  const port = await freePort();

  await server(
    t,
    process.execPath,
    ['apps/api/dist/main.js'],
    {
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/invalid?connect_timeout=1',
        PORT: port,
      },
    },
    `http://localhost:${port}/api/health`,
  );
  assert.equal((await fetch(`http://localhost:${port}/api/health/ready`)).status, 503);
  assert.equal((await fetch(`http://localhost:${port}/api/health`)).status, 200);
});

void test('S09 committed schema persists a user and enforces unique email', async (t) => {
  const client = new pg.Client({connectionString: databaseUrl});

  await client.connect();
  t.after(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });
  await client.query('BEGIN');

  const id = randomUUID();
  const email = `${id}@example.test`;

  await client.query('INSERT INTO "User" (id,email,"updatedAt") VALUES ($1,$2,NOW())', [id, email]);
  assert.equal(
    (await client.query('SELECT email FROM "User" WHERE id=$1', [id])).rows[0].email,
    email,
  );
  await assert.rejects(
    client.query('INSERT INTO "User" (id,email,"updatedAt") VALUES ($1,$2,NOW())', [
      randomUUID(),
      email,
    ]),
    (error) => error.code === UNIQUE_VIOLATION_CODE,
  );
});
