import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFileSync, spawnSync} from 'node:child_process';

import {validateManifest, validateReleaseRetry, validateReleaseState} from './release-manifest.mjs';
import {imageDigest} from './image-registry.mjs';

import {PROCESS_EXIT} from './policy-constants.mjs';

export const RELEASE_ASSETS_VERIFICATION_ERROR = 'Cannot verify release assets.';

export const EXISTING_RELEASE_VERIFICATION_ERROR = 'Cannot verify existing release.';

const manifest = validateManifest(JSON.parse(readFileSync('release-manifest.json', 'utf8')));

if (
  !manifest.version ||
  manifest.commit !== process.env.GITHUB_SHA ||
  manifest.repository !== process.env.GITHUB_REPOSITORY
)
  throw new Error('Invalid release context.');

const gh = (...args) => execFileSync('gh', args, {encoding: 'utf8'});

const tag = `v${manifest.version}`;

const result = spawnSync('gh', ['release', 'view', tag, '--json', 'isDraft,targetCommitish'], {
  encoding: 'utf8',
});

if (result.status === PROCESS_EXIT.SUCCESS) {
  const directory = mkdtempSync(path.join(tmpdir(), 'weave-release-'));

  try {
    const release = JSON.parse(result.stdout);
    const download = spawnSync(
      'gh',
      ['release', 'download', tag, '--pattern', 'release-manifest.json', '--dir', directory],
      {encoding: 'utf8'},
    );

    validateReleaseState(manifest, release, download.status === PROCESS_EXIT.SUCCESS);

    if (download.status === PROCESS_EXIT.SUCCESS)
      validateReleaseRetry(
        manifest,
        JSON.parse(readFileSync(path.join(directory, 'release-manifest.json'), 'utf8')),
      );
    else {
      if (!/no assets match|no assets to download/i.test(download.stderr))
        throw new Error(download.stderr || RELEASE_ASSETS_VERIFICATION_ERROR);

      gh('release', 'upload', tag, 'release-manifest.json', 'CHANGELOG.release.md', '--clobber');
    }
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
} else {
  if (!/not found|HTTP 404/i.test(result.stderr))
    throw new Error(result.stderr || EXISTING_RELEASE_VERIFICATION_ERROR);

  // A draft carries immutable metadata before aliases; reruns must match it.
  gh(
    'release',
    'create',
    tag,
    'release-manifest.json',
    'CHANGELOG.release.md',
    '--draft',
    '--target',
    manifest.commit,
    '--title',
    tag,
    '--notes-file',
    'CHANGELOG.release.md',
  );
}

for (const app of ['api', 'web']) {
  const alias = `ghcr.io/${manifest.repository}-${app}:${manifest.version}`;
  const expected = manifest.images[app].split('@')[1];
  const current = imageDigest(alias);

  if (current && current !== expected)
    throw new Error('Refusing to overwrite official image version.');

  if (!current)
    execFileSync(
      'docker',
      ['buildx', 'imagetools', 'create', '--prefer-index=false', '-t', alias, manifest.images[app]],
      {stdio: 'inherit'},
    );

  if (imageDigest(alias) !== expected) throw new Error('Official alias changed digest.');
}

gh('release', 'edit', tag, '--draft=false');
