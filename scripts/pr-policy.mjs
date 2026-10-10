import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';

import {validateCommit, validatePullRequest} from './policy.mjs';

import {GIT_BRANCH} from './policy-constants.mjs';

import {MISSING_VALUE} from './policy-constants.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

const pr = event.pull_request;

if (!pr) throw new Error('PR policy expects a pull_request event.');

const error =
  validatePullRequest({
    base: pr.base.ref,
    head: pr.head.ref,
    sameRepository: pr.head.repo.full_name === pr.base.repo.full_name,
  }) ?? validateCommit(pr.title);

if (error) throw new Error(error);

if (pr.base.ref === GIT_BRANCH.DEVELOP) {
  const ticket = /WEA-\d+/.exec(pr.head.ref)[0];

  if (!pr.title.endsWith(`[${ticket}]`)) throw new Error('PR title must use the branch ticket.');

  const body = pr.body ?? MISSING_VALUE;
  const match = /Spec: (specs\/[a-z0-9-]+)\/spec\.md/.exec(body);

  if (
    !match ||
    !body.includes(`Evidence: ${match[1]}/evidence.md`) ||
    !body.includes(`/issue/${ticket}`)
  )
    throw new Error('PR requires matching Linear, Spec and Evidence links.');

  const workflow = JSON.parse(readFileSync(`${match[1]}/workflow.json`, 'utf8'));

  if (workflow.ticket !== ticket) throw new Error('Spec ticket does not match branch.');

  execFileSync('git', ['merge-base', '--is-ancestor', 'origin/develop', 'HEAD']);
  process.env.SDD_TICKET = ticket;
  await import('./check-sdd.mjs');
}

const commits = execFileSync(
  'git',
  ['log', '--no-merges', '--format=%B%x00', `${pr.base.sha}..HEAD`],
  {encoding: 'utf8'},
)
  .split('\0')
  .map((value) => value.trim())
  .filter(Boolean);

for (const commit of commits) {
  const error = validateCommit(commit);

  if (error) throw new Error(error);
}

console.log('PR source, title, commits, ancestry and feature traceability passed.');
