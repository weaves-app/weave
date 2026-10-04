import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateBranch} from '../../scripts/policy.mjs';
test('S01 accepts ticket branches and rejects shared/malformed names', () => {
  for (const branch of [
    'feat/WEA-6/setup-workflow',
    'fix/WEA-12/repair-form',
    'bugfix/WEA-1/repair-form',
    'hotfix/WEA-2/repair-form',
  ])
    assert.equal(validateBranch(branch), null);
  for (const branch of [
    'develop',
    'main',
    'WEA-6/FEAT/setup',
    'feat/WEA-0/setup',
    'feat/WEA-6',
    'feat/WEA-6/../main',
    'feat/ABC-1/setup',
  ])
    assert.ok(validateBranch(branch));
});
