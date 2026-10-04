import {existsSync, readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ticket =
  process.env.SDD_TICKET ??
  /WEA-\d+/.exec(execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}))?.[0];
const directories = readdirSync('specs', {withFileTypes: true})
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join('specs', entry.name));
const relevant = directories.filter(
  (directory) =>
    existsSync(`${directory}/workflow.json`) &&
    (!ticket || JSON.parse(readFileSync(`${directory}/workflow.json`, 'utf8')).ticket === ticket),
);
if (!relevant.length) throw new Error('No feature artifacts match the working ticket.');
for (const directory of relevant) {
  for (const file of [
    'spec.md',
    'plan.md',
    'tasks.md',
    'workflow.json',
    'evidence.md',
    'convergence.md',
  ])
    if (!existsSync(`${directory}/${file}`)) throw new Error(`Missing ${directory}/${file}`);
  const state = JSON.parse(readFileSync(`${directory}/workflow.json`, 'utf8'));
  if (state.scenariosConfirmed !== true || !state.confirmation || !state.scenarioIds?.length)
    throw new Error('Scenario agreement must be recorded before implementation.');
  const spec = readFileSync(`${directory}/spec.md`, 'utf8');
  const evidence = readFileSync(`${directory}/evidence.md`, 'utf8');
  for (const id of state.scenarioIds)
    if (!spec.includes(id) || !evidence.includes(id))
      throw new Error(`${id} requires specification and evidence traceability.`);
}
console.log(
  'Spec artifacts and scenario traceability passed; reviewers verify semantic coverage and TDD chronology.',
);
