import assert from 'node:assert/strict';
import {test} from 'node:test';
import {validateGithubAccount} from '../../scripts/policy.mjs';
test('S10 publishing verifies actual account instead of trusting credential labels', () => {
  assert.equal(validateGithubAccount('cvvishnuu', 'cvvishnuu'), null);
  assert.ok(validateGithubAccount('cvvishnuu', 'ashr8'));
  assert.ok(validateGithubAccount('cvvishnuu', 'someone-else'));
  assert.ok(validateGithubAccount('', 'cvvishnuu'));
  assert.ok(validateGithubAccount('ashr8', 'ashr8'));
});
