import {appendFileSync} from 'node:fs';
import {execFileSync, spawnSync} from 'node:child_process';

const repository = process.env.GITHUB_REPOSITORY;

const [owner, name] = repository.split('/');

const ownerType = execFileSync('gh', ['api', `repos/${repository}`, '--jq', '.owner.type'], {
  encoding: 'utf8',
}).trim();

for (const app of ['api', 'web']) {
  // Package metadata distinguishes a first publication from a registry auth error.
  const response = spawnSync(
    'gh',
    [
      'api',
      `${ownerType === 'Organization' ? 'orgs' : 'users'}/${owner}/packages/container/${name}-${app}/versions`,
      '--paginate',
      '--slurp',
    ],
    {encoding: 'utf8'},
  );
  let digest = '';

  if (response.status === 0) {
    const versions = JSON.parse(response.stdout).flat();

    digest =
      versions.find((version) =>
        version.metadata?.container?.tags?.includes(`sha-${process.env.GITHUB_SHA}`),
      )?.name ?? '';

    if (digest && !/^sha256:[a-f0-9]{64}$/.test(digest))
      throw new Error('Invalid candidate digest.');
  } else if (!/HTTP 404/.test(response.stderr))
    throw new Error(response.stderr || 'Cannot verify existing candidate.');

  appendFileSync(process.env.GITHUB_OUTPUT, `${app}=${digest}\n`);
}
