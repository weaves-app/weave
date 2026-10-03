import assert from 'node:assert/strict';
import {test} from 'node:test';
import {evaluateTool} from '../../scripts/agent-policy.mjs';
test('S10 tool guard permits investigation and specs, gates source edits', () => {
  assert.equal(
    evaluateTool(
      {tool_name: 'Bash', tool_input: {command: 'cat apps/api/src/main.ts'}},
      'develop',
      false,
    ),
    null,
  );
  assert.equal(
    evaluateTool(
      {tool_name: 'apply_patch', tool_input: {patch: '*** Update File: specs/001/spec.md'}},
      'feat/WEA-6/setup',
      false,
    ),
    null,
  );
  assert.ok(
    evaluateTool(
      {tool_name: 'apply_patch', tool_input: {patch: '*** Update File: apps/api/src/main.ts'}},
      'develop',
      true,
    ),
  );
  assert.ok(
    evaluateTool(
      {tool_name: 'apply_patch', tool_input: {patch: '*** Update File: apps/api/src/main.ts'}},
      'feat/WEA-6/setup',
      false,
    ),
  );
  assert.equal(
    evaluateTool(
      {tool_name: 'apply_patch', tool_input: {patch: '*** Update File: apps/api/src/main.ts'}},
      'feat/WEA-6/setup',
      true,
    ),
    null,
  );
});
