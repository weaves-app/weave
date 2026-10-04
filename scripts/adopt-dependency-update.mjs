import {localConfig} from './git-config.mjs';
import {execFileSync} from 'node:child_process';
import {writeFileSync, readFileSync, mkdirSync, mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {validateBranch} from './policy.mjs';
import {isScenarioConfirmed} from './agent-policy.mjs';
import {validateDependencyProposal} from './dependency-policy.mjs';
const [number, ticket, mode] = process.argv.slice(2);
if (!/^\d+$/.test(number ?? '') || !/^WEA-[1-9]\d*$/.test(ticket ?? ''))
  throw new Error('Usage: pnpm run deps:adopt PR_NUMBER NEW_LINEAR_TICKET');
const branch = `fix/${ticket}/dependency-update-${number}`;
const directory = `specs/${ticket.toLowerCase()}-dependency-update-${number}`;
if (validateBranch(branch)) throw new Error('Invalid ticket branch.');
const git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim();
const proposalPatch = `.specify/proposals/${ticket.toLowerCase()}-${number}.patch`;
if (mode === '--apply') {
  const state = JSON.parse(readFileSync(`${directory}/workflow.json`, 'utf8'));
  if (git('branch', '--show-current') !== branch || !isScenarioConfirmed(state, branch))
    throw new Error('Confirm this ticket’s BDD scenarios before applying dependency changes.');
  git('apply', '--check', proposalPatch);
  git('apply', proposalPatch);
  console.log('Confirmed dependency patch applied; run the agreed validation and record evidence.');
  process.exit(0);
}
if (mode) throw new Error('Unknown mode.');
if (git('status', '--porcelain')) throw new Error('Dependency adoption requires a clean checkout.');
const expected = git('config', '--local', '--get', 'weave.githubUser');
const env = {...process.env};
const configDirectory = localConfig('weave.ghConfigDir');
if (configDirectory) env.GH_CONFIG_DIR = configDirectory;
delete env.GH_TOKEN;
delete env.GITHUB_TOKEN;
const gh = (...args) => execFileSync('gh', args, {encoding: 'utf8', env});
if (gh('api', 'user', '--jq', '.login').trim().toLowerCase() !== expected.toLowerCase())
  throw new Error('GitHub identity mismatch.');
const repository = gh('repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner').trim();
const proposal = JSON.parse(
  gh('pr', 'view', number, '--json', 'author,baseRefName,headRepository,headRepositoryOwner,files'),
);
const error = validateDependencyProposal({
  author: proposal.author.login,
  sameRepository:
    `${proposal.headRepositoryOwner.login}/${proposal.headRepository.name}` === repository,
  base: proposal.baseRefName,
  files: proposal.files.map((file) => file.path),
});
if (error) throw new Error(error);
git('fetch', 'origin', 'develop');
git('fetch', 'origin', `pull/${number}/head`);
const diff = execFileSync('git', ['diff', 'origin/develop...FETCH_HEAD'], {encoding: 'utf8'});
const temp = mkdtempSync(path.join(tmpdir(), 'weave-update-'));
try {
  const patch = path.join(temp, 'update.patch');
  writeFileSync(patch, diff);
  git('switch', '-c', branch, 'origin/develop');
  git('apply', '--check', patch);
  mkdirSync('.specify/proposals', {recursive: true});
  writeFileSync(proposalPatch, diff);
  mkdirSync(directory, {recursive: true});
  const scenarios = ['D01', 'D02', 'D03'];
  writeFileSync(
    `${directory}/workflow.json`,
    JSON.stringify(
      {ticket, scenariosConfirmed: false, confirmation: '', scenarioIds: scenarios},
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    `${directory}/spec.md`,
    `# ${ticket}: dependency proposal #${number}\n\nLinear: https://linear.app/weaveapp/issue/${ticket}\n\nD01 happy: supported dependency versions preserve app behavior.\nD02 sad: incompatible or vulnerable updates are rejected.\nD03 edge: lockfile fresh install, all platform exports and production images remain valid.\n\nReview and confirm scenarios before implementation.\n`,
  );
  writeFileSync(
    `${directory}/plan.md`,
    '# Plan\n\nReview upstream changes, agree scenario scope, run relevant regression checks, update lockfile and verification evidence. No automatic merge.\n',
  );
  writeFileSync(
    `${directory}/tasks.md`,
    '- [ ] Agree scenarios and identify meaningful tests.\n- [ ] Validate proposal, fresh install, verify/integration/containers.\n- [ ] Record evidence/convergence and open reviewed ticket PR.\n',
  );
  writeFileSync(
    `${directory}/evidence.md`,
    '# Evidence\n\nD01, D02, D03: pending; no validation claimed.\n',
  );
  writeFileSync(
    `${directory}/convergence.md`,
    '# Convergence\n\nPending scenario agreement and verification.\n',
  );
  writeFileSync(
    '.specify/feature.json',
    JSON.stringify({feature_directory: directory}, null, 2) + '\n',
  );
} finally {
  rmSync(temp, {recursive: true, force: true});
}
console.log(
  `Prepared proposal on ${branch}. Confirm BDD scenarios, then run pnpm run deps:adopt ${number} ${ticket} --apply; bot PR stays blocked. No commit, push or merge performed.`,
);
