import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const environment = process.env.TARGET_ENVIRONMENT;
if (
  manifest.repository !== repository ||
  manifest.version !== process.env.VERSION ||
  !['qa', 'production'].includes(environment)
)
  throw new Error('Release manifest mismatch.');
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
