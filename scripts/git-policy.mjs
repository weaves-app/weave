import {execFileSync, spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {validateBranch, validateCommit, validateGithubAccount} from './policy.mjs';
const branch = execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim();
let error = validateBranch(branch);
if (process.argv[2] === 'commit') {
  const message = readFileSync(process.argv[3], 'utf8').replace(/\n$/, '');
  error ??= validateCommit(message);
  const ticket = /WEA-\d+/.exec(branch)?.[0];
  if (!message.endsWith(`[${ticket}]`)) error ??= 'Commit ticket must match branch ticket.';
}
const localName = execFileSync('git', ['config', '--local', '--get', 'user.name'], {
  encoding: 'utf8',
}).trim();
const localEmail = execFileSync('git', ['config', '--local', '--get', 'user.email'], {
  encoding: 'utf8',
}).trim();
const forbiddenResult = spawnSync(
  'git',
  ['config', '--local', '--get-all', 'weave.forbiddenIdentity'],
  {encoding: 'utf8'},
);
const forbidden = forbiddenResult.status === 0 ? forbiddenResult.stdout.trim().split('\n') : [];
if (
  forbidden.some((identity) =>
    [localName, localEmail].some((value) => value.toLowerCase() === identity.toLowerCase()),
  )
)
  error ??= 'Repository-local forbidden identity is not permitted.';
for (const identity of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
  const value = execFileSync('git', ['var', identity], {encoding: 'utf8'});
  if (!value.startsWith(`${localName} <${localEmail}>`))
    error ??= 'Author/committer must match your repository-local personal identity.';
}
if (error) {
  console.error(error);
  process.exitCode = 1;
}

if (!error && process.argv[2] === 'push') {
  const config = (key) => {
    const result = spawnSync('git', ['config', '--local', '--get', key], {encoding: 'utf8'});
    return result.status === 0 ? result.stdout.trim() : '';
  };
  const expected = config('weave.githubUser');
  if (!expected)
    throw new Error(
      'Set git config --local weave.githubUser YOUR_PERSONAL_GITHUB_LOGIN before pushing.',
    );
  const env = {...process.env};
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  const configDirectory = config('weave.ghConfigDir');
  if (configDirectory) env.GH_CONFIG_DIR = configDirectory;
  try {
    env.GH_TOKEN = execFileSync(
      'gh',
      ['auth', 'token', '--hostname', 'github.com', '--user', expected],
      {encoding: 'utf8', env},
    ).trim();
    const actual = execFileSync('gh', ['api', 'user', '--jq', '.login'], {
      encoding: 'utf8',
      env,
    }).trim();
    const identityError = validateGithubAccount(expected, actual, forbidden);
    if (identityError) {
      console.error(identityError);
      process.exitCode = 1;
    }
  } catch {
    console.error('Cannot verify the personal GitHub credential; publication is blocked.');
    process.exitCode = 1;
  }
}
