import {localConfig} from '../../scripts/git-config.mjs';

import assert from 'node:assert/strict';
import {before, test} from 'node:test';
import {execFileSync, spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, chmodSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

before(() => {
  // Hooks export repository paths; fixtures must not read or mutate the caller's repository.
  const variables = execFileSync('git', ['rev-parse', '--local-env-vars'], {encoding: 'utf8'});

  for (const name of variables.trim().split('\n')) delete process.env[name];
});

test('S21 dependency adoption permits the default personal CLI profile when the optional key is absent', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'weave-config-'));

  try {
    execFileSync('git', ['init', '--quiet', directory]);
    execFileSync('git', ['-C', directory, 'config', '--local', 'weave.githubUser', 'personal']);

    const executableDirectory = mkdtempSync(path.join(tmpdir(), 'weave-bin-'));

    try {
      const gh = path.join(executableDirectory, 'gh');

      writeFileSync(
        gh,
        '#!/bin/sh\nif [ "$1" = "api" ]; then echo personal; else echo REACHED_DEFAULT_PROFILE >&2; exit 1; fi\n',
      );
      chmodSync(gh, 0o755);

      const result = spawnSync(
        process.execPath,
        [path.resolve('scripts/adopt-dependency-update.mjs'), '1', 'WEA-99'],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {...process.env, PATH: `${executableDirectory}:${process.env.PATH}`},
        },
      );

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /REACHED_DEFAULT_PROFILE/);
    } finally {
      rmSync(executableDirectory, {recursive: true, force: true});
    }
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});

test('S21 local config distinguishes absent keys, explicit profiles and Git errors', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'weave-local-config-'));

  try {
    assert.throws(
      () => localConfig('weave.ghConfigDir', {cwd: directory}),
      /repository|Git configuration/,
    );
    execFileSync('git', ['init', '--quiet', directory]);
    assert.equal(localConfig('weave.ghConfigDir', {cwd: directory}), '');
    execFileSync('git', [
      '-C',
      directory,
      'config',
      '--local',
      'weave.ghConfigDir',
      '/personal/profile',
    ]);
    assert.equal(localConfig('weave.ghConfigDir', {cwd: directory}), '/personal/profile');
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
