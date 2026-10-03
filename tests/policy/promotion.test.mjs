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
