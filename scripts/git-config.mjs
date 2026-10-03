import {spawnSync} from 'node:child_process';
export function localConfig(key, {all = false, cwd = process.cwd()} = {}) {
  const result = spawnSync('git', ['config', '--local', all ? '--get-all' : '--get', key], {
    encoding: 'utf8',
    cwd,
  });
  if (result.error) throw result.error;
  if (result.status === 1) return '';
  if (result.status !== 0)
    throw new Error(result.stderr.trim() || 'Cannot read repository-local Git configuration.');
  return result.stdout.trim();
}
