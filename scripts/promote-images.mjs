import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validatePromotion} from './release-manifest.mjs';
const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const environment = process.env.TARGET_ENVIRONMENT;
const qa = {};
if (environment === 'production')
  for (const app of ['api', 'web']) {
    qa[app] = JSON.parse(
      execFileSync(
        'docker',
        [
          'buildx',
          'imagetools',
          'inspect',
          `ghcr.io/${repository}-${app}:qa`,
          '--format',
          '{{json .Manifest.Digest}}',
        ],
        {encoding: 'utf8'},
      ),
    );
  }
validatePromotion(manifest, {repository, version: process.env.VERSION, environment, qa});
for (const app of ['api', 'web']) {
  const image = manifest.images[app];
  const expected = `ghcr.io/${repository}-${app}@sha256:`;
  if (!image.startsWith(expected) || !/^[a-f0-9]{64}$/.test(image.slice(expected.length)))
    throw new Error('Invalid immutable image reference.');
  execFileSync(
    'docker',
    [
      'buildx',
      'imagetools',
      'create',
      '--prefer-index=false',
      '-t',
      `ghcr.io/${repository}-${app}:${environment}`,
      image,
    ],
    {stdio: 'inherit'},
  );
  const digest = execFileSync(
    'docker',
    [
      'buildx',
      'imagetools',
      'inspect',
      `ghcr.io/${repository}-${app}:${environment}`,
      '--format',
      '{{json .Manifest.Digest}}',
    ],
    {encoding: 'utf8'},
  ).trim();
  if (JSON.parse(digest) !== image.slice(image.indexOf('@') + 1))
    throw new Error('Promotion changed image digest.');
}
console.log(
  'Same release digests promoted. This updates registry aliases; AWS deployment is a separate environment integration.',
);
