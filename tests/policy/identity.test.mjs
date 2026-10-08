import assert from 'node:assert/strict';
import {test} from 'node:test';

import {validateGithubAccount} from '../../scripts/policy.mjs';

test('S10 publishing verifies actual account instead of trusting credential labels', () => {
  assert.equal(validateGithubAccount('personal-example', 'personal-example'), null);
  assert.ok(validateGithubAccount('personal-example', 'company-example'));
  assert.ok(validateGithubAccount('personal-example', 'someone-else'));
  assert.ok(validateGithubAccount('', 'personal-example'));
  assert.ok(validateGithubAccount('company-example', 'company-example', ['company-example']));
});

test('S13 forbidden identities are local policy, not a hard-coded account', () => {
  assert.equal(validateGithubAccount('company-example', 'company-example'), null);
  assert.ok(validateGithubAccount('company-example', 'company-example', ['company-example']));
  assert.ok(validateGithubAccount('PERSONAL-example', 'personal-example', ['personal-example']));
});
