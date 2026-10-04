import {mkdtempSync, writeFileSync, chmodSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {
  createManifest,
  validatePromotion,
  validateReleaseRetry,
} from '../../scripts/release-manifest.mjs';
const repository = 'example/weave';
const digest = `sha256:${'a'.repeat(64)}`;
const input = {
  repository,
  commit: 'b'.repeat(40),
  version: '0.1.0',
  apiDigest: digest,
  webDigest: digest,
};
const expected = {
  repository,
  commit: input.commit,
  version: '0.1.0',
  images: {api: `ghcr.io/${repository}-api@${digest}`, web: `ghcr.io/${repository}-web@${digest}`},
};
test('S16 creates an immutable manifest and rejects malformed boundaries', () => {
  assert.deepEqual(createManifest(input), expected);
  for (const override of [
    {repository: '../invalid'},
    {apiDigest: 'latest'},
    {commit: 'wrong'},
    {version: '0.01.0'},
  ])
    assert.throws(() => createManifest({...input, ...override}));
});
test('S16 production requires the matching QA digests for every app', () => {
  assert.throws(() =>
    validatePromotion(expected, {repository, version: '0.1.0', environment: 'production', qa: {}}),
  );
  assert.throws(() =>
    validatePromotion(expected, {
      repository,
      version: '0.1.0',
      environment: 'production',
      qa: {api: digest, web: `sha256:${'c'.repeat(64)}`},
    }),
  );
  assert.doesNotThrow(() =>
    validatePromotion(expected, {
      repository,
      version: '0.1.0',
      environment: 'production',
      qa: {api: digest, web: digest},
    }),
  );
  assert.doesNotThrow(() =>
    validatePromotion(expected, {repository, version: '0.1.0', environment: 'qa'}),
  );
  assert.throws(() =>
    validatePromotion(expected, {repository: 'foreign/repo', version: '0.1.0', environment: 'qa'}),
  );
});
test('S16 retries accept the same release and reject artifact replacement', () => {
  assert.doesNotThrow(() => validateReleaseRetry(expected, expected));
  assert.throws(() => validateReleaseRetry(expected, {...expected, commit: 'c'.repeat(40)}));
  assert.throws(() =>
    validateReleaseRetry(expected, {...expected, images: {...expected.images, web: 'other'}}),
  );
});

test('S16 only matching incomplete drafts may recover missing assets', async () => {
  const {validateReleaseState} = await import('../../scripts/release-manifest.mjs');
  assert.doesNotThrow(() =>
    validateReleaseState(expected, {isDraft: true, targetCommitish: expected.commit}, false),
  );
  assert.throws(() =>
    validateReleaseState(expected, {isDraft: false, targetCommitish: expected.commit}, false),
  );
  assert.throws(() =>
    validateReleaseState(expected, {isDraft: true, targetCommitish: 'other'}, false),
  );
});

test('S22 missing QA aliases fail with the production policy message before mutation', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'weave-qa-'));
  try {
    writeFileSync(path.join(directory, 'release-manifest.json'), JSON.stringify(expected));
    const docker = path.join(directory, 'docker');
    writeFileSync(
      docker,
      '#!/bin/sh\nif [ "$3" = "inspect" ]; then echo "manifest unknown" >&2; exit 1; fi\necho "UNEXPECTED_MUTATION" >&2; exit 2\n',
    );
    chmodSync(docker, 0o755);
    const result = spawnSync(process.execPath, [path.resolve('scripts/promote-images.mjs')], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        GITHUB_REPOSITORY: repository,
        TARGET_ENVIRONMENT: 'production',
        VERSION: '0.1.0',
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production requires matching QA digest/);
    assert.doesNotMatch(result.stderr, /UNEXPECTED_MUTATION/);
  } finally {
    rmSync(directory, {recursive: true, force: true});
  }
});
