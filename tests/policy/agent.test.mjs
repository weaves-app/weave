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

test('S10 missing/foreign feature state cannot authorize an implementation branch', async () => {
  const {isScenarioConfirmed} = await import('../../scripts/agent-policy.mjs');
  const state = {
    ticket: 'WEA-6',
    scenariosConfirmed: true,
    confirmation: 'User continuation',
    scenarioIds: ['S10'],
  };
  assert.equal(isScenarioConfirmed(state, 'feat/WEA-6/setup'), true);
  assert.equal(isScenarioConfirmed(undefined, 'feat/WEA-6/setup'), false);
  assert.equal(isScenarioConfirmed(state, 'feat/WEA-7/setup'), false);
  assert.equal(isScenarioConfirmed({...state, scenarioIds: []}, 'feat/WEA-6/setup'), false);
});
