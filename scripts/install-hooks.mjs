import {existsSync, chmodSync, readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

import {PROCESS_EXIT} from './policy-constants.mjs';

if (existsSync('.git') && !process.env.CI) {
  for (const file of readdirSync('.githooks')) chmodSync(`.githooks/${file}`, 0o755);

  const result = spawnSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], {
    stdio: 'inherit',
  });

  if (result.status !== PROCESS_EXIT.SUCCESS) process.exitCode = 1;
}
