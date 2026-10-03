import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {validateBranch, validateCommit} from './policy.mjs';
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
if (/ashr8/i.test(localName)) error ??= 'Company identity ashr8 is not permitted for Weave.';
for (const identity of ['GIT_AUTHOR_IDENT', 'GIT_COMMITTER_IDENT']) {
  const value = execFileSync('git', ['var', identity], {encoding: 'utf8'});
  if (!value.startsWith(`${localName} <${localEmail}>`))
    error ??= 'Author/committer must match your repository-local personal identity.';
}
if (error) {
  console.error(error);
  process.exitCode = 1;
}
