import {spawnSync} from 'node:child_process';

import {PROCESS_EXIT} from './policy-constants.mjs';

export const LOCAL_CONFIG_READ_ERROR = 'Cannot read repository-local Git configuration.';

export function localConfig(key, {all = false, cwd = process.cwd()} = {}) {
  const result = spawnSync('git', ['config', '--local', all ? '--get-all' : '--get', key], {
    encoding: 'utf8',
    cwd,
  });

  if (result.error) throw result.error;

  if (result.status === PROCESS_EXIT.NOT_FOUND) return '';

  if (result.status !== PROCESS_EXIT.SUCCESS)
    throw new Error(result.stderr.trim() || LOCAL_CONFIG_READ_ERROR);

  return result.stdout.trim();
}
