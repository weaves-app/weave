import {readFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {evaluateTool, isScenarioConfirmed} from './agent-policy.mjs';
const event = JSON.parse(readFileSync(0, 'utf8'));
process.chdir(execFileSync('git', ['rev-parse', '--show-toplevel'], {encoding: 'utf8'}).trim());
const branch = execFileSync('git', ['branch', '--show-current'], {encoding: 'utf8'}).trim();
let state;
try {
  const feature = JSON.parse(readFileSync('.specify/feature.json', 'utf8')).feature_directory;
  const directory = path.resolve(feature);
  if (directory.startsWith(path.resolve('specs') + path.sep)) {
    const workflow = path.join(directory, 'workflow.json');
    if (existsSync(workflow)) state = JSON.parse(readFileSync(workflow, 'utf8'));
  }
} catch {
  /* A fresh clone has no machine-local feature pointer; fail closed for source edits. */
}
const confirmed = isScenarioConfirmed(state, branch);
const name = event.hook_event_name;
if (name === 'PreToolUse') {
  const reason = evaluateTool(event, branch, confirmed);
  if (reason)
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: name,
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      }),
    );
  else console.log('{}');
} else if (name === 'SessionStart') {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: name,
        additionalContext:
          'Read AGENTS.md and .specify/memory/constitution.md. Follow Spec Kit, agree BDD scenarios, then red/green/refactor. Use your repository-local personal identity.',
      },
    }),
  );
} else if (name === 'PostToolUse') {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: name,
        additionalContext:
          'After source edits, run the relevant scenario test and update evidence. Final CI checks remain mandatory.',
      },
    }),
  );
} else if (name === 'Stop') {
  console.log(
    JSON.stringify({
      systemMessage:
        'Before reporting implementation complete, run pnpm run verify, database integration, and update feature evidence/convergence. Hooks cannot prove TDD chronology.',
    }),
  );
} else console.log('{}');
