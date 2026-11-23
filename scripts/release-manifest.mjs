import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

import {MISSING_VALUE} from './policy-constants.mjs';

export const PRODUCTION_ENVIRONMENT = 'production';

const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function createManifest({repository, commit, version = null, apiDigest, webDigest}) {
  if (
    !/^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/.test(repository ?? MISSING_VALUE) ||
    !/^[a-f0-9]{40}$/.test(commit ?? MISSING_VALUE) ||
    (version !== null && !stable.test(version))
  )
    throw new Error('Invalid release metadata.');

  for (const digest of [apiDigest, webDigest])
    if (!/^sha256:[a-f0-9]{64}$/.test(digest ?? MISSING_VALUE))
      throw new Error('Invalid immutable digest.');

  return {
    repository,
    commit,
    version,
    images: {
      api: `ghcr.io/${repository}-api@${apiDigest}`,
      web: `ghcr.io/${repository}-web@${webDigest}`,
    },
  };
}

export function validateManifest(manifest) {
  const digests = {};

  for (const app of ['api', 'web']) {
    const prefix = `ghcr.io/${manifest.repository}-${app}@`;
    const image = manifest.images?.[app];

    if (typeof image !== 'string' || !image.startsWith(prefix))
      throw new Error('Invalid image repository.');

    digests[`${app}Digest`] = image.slice(prefix.length);
  }

  return createManifest({...manifest, ...digests});
}

export function validatePromotion(manifest, {repository, version, environment, qa = {}}) {
  validateManifest(manifest);

  if (
    manifest.repository !== repository ||
    manifest.version !== version ||
    !stable.test(version) ||
    !['qa', 'production'].includes(environment)
  )
    throw new Error('Release manifest mismatch.');

  if (environment === PRODUCTION_ENVIRONMENT)
    for (const app of ['api', 'web'])
      if (qa[app] !== manifest.images[app].split('@')[1])
        throw new Error(`Production requires matching QA digest for ${app}.`);
}

export function validateReleaseRetry(manifest, existing) {
  const current = validateManifest(manifest);
  const previous = validateManifest(existing);

  if (JSON.stringify(current) !== JSON.stringify(previous))
    throw new Error('Existing release artifacts cannot be replaced.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const e = process.env;

  writeFileSync(
    'release-manifest.json',
    JSON.stringify(
      createManifest({
        repository: e.GITHUB_REPOSITORY,
        commit: e.GITHUB_SHA,
        version: e.VERSION || null,
        apiDigest: e.API_DIGEST,
        webDigest: e.WEB_DIGEST,
      }),
      null,
      2,
    ) + '\n',
  );
}

export function validateReleaseState(manifest, release, hasManifest) {
  if (release.targetCommitish !== manifest.commit || (!hasManifest && release.isDraft !== true))
    throw new Error('Only a matching incomplete draft can recover missing assets.');
}
