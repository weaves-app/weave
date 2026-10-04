import {existsSync, chmodSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
if (existsSync('.git') && !process.env.CI) {
  for (const file of readdirSync('.githooks')) chmodSync(`.githooks/${file}`, 0o755);
  const result = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exitCode = 1;
}
