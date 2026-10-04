import {imageDigest} from './image-registry.mjs';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {validatePromotion} from './release-manifest.mjs';
const manifest = JSON.parse(readFileSync('release-manifest.json', 'utf8'));
const repository = process.env.GITHUB_REPOSITORY;
const environment = process.env.TARGET_ENVIRONMENT;
const qa = {};
if (environment === 'production')
  for (const app of ['api', 'web']) qa[app] = imageDigest(`ghcr.io/${repository}-${app}:qa`);
validatePromotion(manifest, {repository, version: process.env.VERSION, environment, qa});
for (const app of ['api', 'web']) {
  const image = manifest.images[app];
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
  const digest = imageDigest(`ghcr.io/${repository}-${app}:${environment}`);
  if (digest !== image.slice(image.indexOf('@') + 1))
    throw new Error('Promotion changed image digest.');
}
console.log(
  'Same release digests promoted. This updates registry aliases; AWS deployment is a separate environment integration.',
);
