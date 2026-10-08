import assert from 'node:assert/strict';
import {test} from 'node:test';

import {validateCommit, validatePullRequest} from '../../scripts/policy.mjs';

test('S02 conventional commits are single-line, imperative and traceable', () => {
  for (const value of [
    'feat: add scaffold [WEA-6]',
    'fix(api): repair readiness [WEA-6]',
    'feat!: remove legacy contract [WEA-6]',
  ])
    assert.equal(validateCommit(value), null);

  for (const value of [
    'feat: added scaffold [WEA-6]',
    'feat: add scaffold',
    'feat: add scaffold [WEA-6]\n\nExtra',
    'hello',
    'fix: fixing bug [WEA-6]',
  ])
    assert.ok(validateCommit(value));
});

test('S03 release PRs only originate from same-repository develop', () => {
  assert.equal(validatePullRequest({base: 'main', head: 'develop', sameRepository: true}), null);

  for (const value of [
    {base: 'main', head: 'feat/WEA-6/setup', sameRepository: true},
    {base: 'main', head: 'develop', sameRepository: false},
    {base: 'develop', head: 'main', sameRepository: true},
  ])
    assert.ok(validatePullRequest(value));

  assert.equal(
    validatePullRequest({base: 'develop', head: 'feat/WEA-6/setup', sameRepository: true}),
    null,
  );
});
