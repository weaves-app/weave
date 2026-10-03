import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
const docker = (...args) =>
  execFileSync(
    'docker',
    [
      ...(process.env.WEAVE_DOCKER_CONTEXT ? ['--context', process.env.WEAVE_DOCKER_CONTEXT] : []),
      ...args,
    ],
    {encoding: 'utf8'},
  ).trim();
async function wait(url) {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url, {signal: AbortSignal.timeout(500)});
      if (r.ok) return r;
    } catch {
      /* Wait for runtime startup. */
    }
    await delay(100);
  }
  throw new Error(`Startup timeout: ${url}`);
}
void test('Production containers run as nonroot, connect web to API and keep liveness during outage', async (t) => {
  const suffix = randomUUID();
  const network = `weave-test-${suffix}`;
  const api = `weave-api-${suffix}`;
  const web = `weave-web-${suffix}`;
  docker('network', 'create', network);
  t.after(() => {
    for (const container of [api, web]) {
      try {
        docker('rm', '-f', container);
      } catch {
        /* May not have started. */
      }
    }
    docker('network', 'rm', network);
  });
  docker(
    'run',
    '-d',
    '--name',
    api,
    '--network',
    network,
    '-p',
    '127.0.0.1::3001',
    '-e',
    'DATABASE_URL=postgresql://invalid:invalid@127.0.0.1:1/invalid',
    'weave-api:test',
  );
  const apiUrl = `http://${docker('port', api, '3001/tcp')}`;
  const health = await wait(`${apiUrl}/api/health`);
  assert.equal((await health.json()).service, 'weave-api');
  assert.equal((await fetch(`${apiUrl}/api/health/ready`)).status, 503);
  assert.equal(docker('exec', api, 'id', '-u'), '1000');
  docker(
    'run',
    '-d',
    '--name',
    web,
    '--network',
    network,
    '-p',
    '127.0.0.1::3000',
    '-e',
    `API_URL=http://${api}:3001`,
    'weave-web:test',
  );
  const page = await wait(`http://${docker('port', web, '3000/tcp')}`);
  assert.match(await page.text(), /Connected/);
  assert.equal(docker('exec', web, 'id', '-u'), '1000');
});
