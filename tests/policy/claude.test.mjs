import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync, mkdtempSync, mkdirSync, rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
test('S15 Claude hook envelopes use shared rules without Stop loops', () => {
  const config = JSON.parse(readFileSync('.claude/settings.json', 'utf8'));
  assert.match(readFileSync('CLAUDE.md', 'utf8'), /@AGENTS.md/);
  const script = path.resolve('scripts/agent-hooks.mjs');
  const fixture = mkdtempSync(path.join(tmpdir(), 'weave-hooks-'));
  try {
    execFileSync('git', ['init', '-b', 'feat/WEA-6/setup', fixture], {stdio: 'ignore'});
    mkdirSync(path.join(fixture, '.specify'));
    const invoke = (event) =>
      JSON.parse(
        execFileSync('node', [script], {
          cwd: fixture,
          encoding: 'utf8',
          input: JSON.stringify(event),
        }),
      );
    for (const event of ['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop'])
      assert.equal(config.hooks[event][0].hooks[0].timeout, 10);
    assert.ok(invoke({hook_event_name: 'SessionStart'}).hookSpecificOutput.additionalContext);
    assert.deepEqual(
      invoke({
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: {command: 'rg foo apps/ 2>&1'},
      }),
      {},
    );
    for (const tool_name of ['Write', 'Edit', 'NotebookEdit'])
      assert.equal(
        invoke({
          hook_event_name: 'PreToolUse',
          tool_name,
          tool_input: {file_path: 'apps/api/src/main.ts'},
        }).hookSpecificOutput.permissionDecision,
        'deny',
      );
    const stop = invoke({hook_event_name: 'Stop', stop_hook_active: true});
    assert.ok(stop.systemMessage);
    assert.equal(stop.decision, undefined);
    assert.equal(stop.hookSpecificOutput, undefined);
  } finally {
    rmSync(fixture, {recursive: true, force: true});
  }
});
